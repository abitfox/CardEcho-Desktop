
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';
import { User, Deck, Card } from '../types';

const SUPABASE_URL = (process.env as any).SUPABASE_URL || 'https://zagduqruhmihtdsbrhfo.supabase.co';
const SUPABASE_KEY = (process.env as any).SUPABASE_ANON_KEY || 'sb_publishable_ok_fuF86uYglJ8U75mro7A_p_pmRusS';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const cloudService = {
  // --- AUTH & USER ---
  async signUp(user: User, password?: string): Promise<User | null> {
    if (!password) throw new Error("Password is required for signup");

    // 1. 使用 Supabase Auth 注册
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email,
      password: password,
      options: {
        data: {
          full_name: user.name,
          avatar_url: user.avatar
        }
      }
    });

    // 如果报错，直接抛出 Supabase 的错误
    if (authError) {
      console.error("Supabase Auth Error:", authError);
      throw authError; 
    }
    
    if (!authData.user) return null;

    // 2. 在 profiles 表中同步用户信息
    // 注意：如果 Supabase 开启了 Email Confirmation，此时用户可能尚未真正登录（Session 为空）
    // 我们使用 upsert 并忽略 RLS 错误（或者确保 SQL 策略允许插入）
    const { data: profileData, error: profileError } = await supabase.from('profiles').upsert({ 
      id: authData.user.id, 
      email: user.email, 
      name: user.name, 
      avatar_url: user.avatar,
      role: 0, 
      updated_at: new Date().toISOString() 
    }, { onConflict: 'id' }).select().single();

    // 如果 profile 插入失败（可能是由于 RLS 限制未验证用户插入），我们至少返回 authData 的基本信息
    if (profileError) {
      console.warn("Profile sync warning:", profileError.message);
      return {
        id: authData.user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: 0
      };
    }

    return { 
      id: profileData.id, 
      email: profileData.email, 
      name: profileData.name, 
      avatar: profileData.avatar_url,
      role: profileData.role 
    };
  },

  async signIn(email: string, password: string): Promise<User | null> {
    // 1. 使用 Supabase Auth 登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      // 这里的错误通常是 "Invalid login credentials"
      throw authError;
    }
    
    if (!authData.user) return null;

    // 2. 获取关联的 Profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
        console.error("Fetch profile error:", profileError);
    }
    
    // 如果没有 profile（可能注册时同步失败），则补全
    if (!profileData) {
      const { data: newProfile } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: email,
        name: email.split('@')[0],
        avatar_url: `https://ui-avatars.com/api/?name=${email}&background=random`
      }).select().single();
      
      if (newProfile) {
        return { 
          id: newProfile.id, 
          email: newProfile.email, 
          name: newProfile.name, 
          avatar: newProfile.avatar_url,
          role: newProfile.role 
        };
      }
    }

    return profileData ? { 
      id: profileData.id, 
      email: profileData.email, 
      name: profileData.name, 
      avatar: profileData.avatar_url,
      role: profileData.role 
    } : {
        id: authData.user.id,
        email: email,
        name: email.split('@')[0],
        role: 0
    };
  },

  async getUserProfile(email: string): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (data) return { 
        id: data.id, 
        email: data.email, 
        name: data.name, 
        avatar: data.avatar_url,
        role: data.role 
      };
    }
    
    // 兜底查询
    const { data } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
    if (data) return { 
        id: data.id, 
        email: data.email, 
        name: data.name, 
        avatar: data.avatar_url,
        role: data.role 
    };
    return null;
  },

  // --- 其他方法保持不变 ---
  async fetchStoreDecks(): Promise<Deck[]> {
    try {
      const { data, error } = await supabase
        .from('store_decks')
        .select(`id, title, description, icon, author, user_id, created_at, tags, origin_deck_id, store_cards (*)`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        icon: d.icon,
        author: d.author,
        createdBy: d.user_id,
        createdAt: new Date(d.created_at).getTime(),
        tags: d.tags || [], 
        originDeckId: d.origin_deck_id,
        cards: (d.store_cards || []).map((c: any) => ({
          id: c.id, 
          text: c.text, 
          translation: c.translation, 
          audioUrl: c.audio_url, 
          context: c.context, 
          grammar_note: c.grammar_note, 
          breakdown: c.breakdown
        }))
      }));
    } catch (err: any) {
      console.warn("Store fetch failed:", err.message);
      return [];
    }
  },

  async publishToStore(deck: Deck, userId: string, userName: string): Promise<void> {
    const { data: existing } = await supabase
      .from('store_decks')
      .select('id')
      .eq('origin_deck_id', deck.id)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existing) {
      const { error: uErr } = await supabase
        .from('store_decks')
        .update({
          description: deck.description,
          icon: deck.icon,
          author: userName,
          tags: deck.tags || []
        })
        .eq('id', existing.id);
      
      if (uErr) throw uErr;
      
      await supabase.from('store_cards').delete().eq('deck_id', existing.id);
      const cardsToInsert = deck.cards.map(card => ({ 
        deck_id: existing.id, 
        text: card.text, 
        translation: card.translation, 
        audio_url: card.audioUrl, 
        context: card.context, 
        grammar_note: card.grammarNote, 
        breakdown: card.breakdown 
      }));
      await supabase.from('store_cards').insert(cardsToInsert);
    } else {
      const { data: newStoreDeck, error: dErr } = await supabase
        .from('store_decks')
        .insert({ 
          title: deck.title, 
          description: deck.description, 
          icon: deck.icon, 
          author: userName,
          user_id: userId,
          origin_deck_id: deck.id, 
          tags: deck.tags || []
        })
        .select()
        .single();
      
      if (dErr) throw dErr;
      
      const cardsToInsert = deck.cards.map(card => ({ 
        deck_id: newStoreDeck.id, 
        text: card.text, 
        translation: card.translation, 
        audio_url: card.audioUrl, 
        context: card.context, 
        grammar_note: card.grammarNote, 
        breakdown: card.breakdown 
      }));
      await supabase.from('store_cards').insert(cardsToInsert);
    }
  },

  async updateStoreDeckMetadata(deckId: string, metadata: { title: string, description: string, icon: string, tags: string[] }): Promise<void> {
    const { error } = await supabase
      .from('store_decks')
      .update({
        title: metadata.title,
        description: metadata.description,
        icon: metadata.icon,
        tags: metadata.tags
      })
      .eq('id', deckId);
    
    if (error) throw error;
  },

  async deleteStoreDeck(deckId: string): Promise<void> {
    const { error: cardError } = await supabase.from('store_cards').delete().eq('deck_id', deckId);
    if (cardError) throw cardError;

    const { error: deckError } = await supabase.from('store_decks').delete().eq('id', deckId);
    if (deckError) throw deckError;
  },

  async seedStoreData(mockDecks: Deck[]): Promise<void> {
    for (const deck of mockDecks) {
      try {
        const { data: existing } = await supabase.from('store_decks').select('id').eq('title', deck.title).maybeSingle();
        if (existing) continue;
        const { data: newDeck, error: dErr } = await supabase.from('store_decks').insert({ 
          title: deck.title, 
          description: deck.description, 
          icon: deck.icon, 
          author: deck.author,
          tags: deck.tags || []
        }).select().single();
        if (dErr) throw dErr;
        const cardsToInsert = deck.cards.map(card => ({ 
          deck_id: newDeck.id, 
          text: card.text, 
          translation: card.translation, 
          audio_url: card.audioUrl, 
          context: card.context, 
          grammar_note: card.grammarNote, 
          breakdown: card.breakdown 
        }));
        await supabase.from('store_cards').insert(cardsToInsert);
      } catch (err: any) {
        console.error(`Failed to seed ${deck.title}:`, err.message);
      }
    }
  },

  async uploadAudio(cardId: string, base64Audio: string): Promise<string | null> {
    try {
      const isMp3 = base64Audio.includes('audio/mpeg');
      const base64Data = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
      const binary = atob(base64Data);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      
      const mimeType = isMp3 ? 'audio/mpeg' : 'audio/wav';
      const ext = isMp3 ? '.mp3' : '.wav';
      const blob = new Blob([array], { type: mimeType });

      const fileName = `${cardId}_${Date.now()}${ext}`;
      
      const { error } = await supabase.storage
        .from('card-audio')
        .upload(fileName, blob, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('card-audio')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('File upload failed:', err.message);
      return null;
    }
  },

  async saveDeck(deck: Deck, userId: string): Promise<void> {
    const { error: deckError } = await supabase.from('decks').upsert({ 
      id: deck.id, 
      user_id: userId, 
      title: deck.title, 
      description: deck.description, 
      icon: deck.icon, 
      is_subscribed: deck.isSubscribed || false, 
      author: deck.author, 
      created_at: new Date(deck.createdAt).toISOString() 
    });
    if (deckError) throw deckError;
    
    if (deck.cards.length > 0) {
      const cardsToInsert = deck.cards.map(card => ({ 
        id: card.id, 
        deck_id: deck.id, 
        text: card.text, 
        translation: card.translation, 
        audio_url: card.audioUrl, 
        context: card.context, 
        grammar_note: card.grammarNote, 
        breakdown: card.breakdown 
      }));
      const { error: cardError } = await supabase.from('cards').upsert(cardsToInsert);
      if (cardError) throw cardError;
    }
  },

  async fetchUserDecks(userId: string): Promise<Deck[]> {
    const { data, error } = await supabase
      .from('decks')
      .select(`*, cards (*)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(d => ({
      ...d, 
      createdAt: new Date(d.created_at).getTime(), 
      isSubscribed: d.is_subscribed,
      cards: d.cards.map((c: any) => ({ 
        ...c, 
        audioUrl: c.audio_url, 
        grammarNote: c.grammar_note 
      }))
    }));
  },

  async deleteDeck(deckId: string): Promise<void> {
    await supabase.from('cards').delete().eq('deck_id', deckId);
    const { error } = await supabase.from('decks').delete().eq('id', deckId);
    if (error) throw error;
  }
};
