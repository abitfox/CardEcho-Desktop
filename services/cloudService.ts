
import { createClient } from '@supabase/supabase-js';
import { User, Deck, Card } from '../types';

const SUPABASE_URL = (process.env as any).SUPABASE_URL || 'https://zagduqruhmihtdsbrhfo.supabase.co';
const SUPABASE_KEY = (process.env as any).SUPABASE_ANON_KEY || 'sb_publishable_ok_fuF86uYglJ8U75mro7A_p_pmRusS';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const cloudService = {
  // --- AUTH & USER ---
  async signUp(user: User, password?: string): Promise<User | null> {
    if (!password) throw new Error("Password is required for signup");

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

    if (authError) throw authError; 
    if (!authData.user) return null;

    const { data: profileData, error: profileError } = await supabase.from('profiles').upsert({ 
      id: authData.user.id, 
      email: user.email, 
      name: user.name, 
      avatar_url: user.avatar,
      role: 0,
      daily_goal: 20,
      streak: 0,
      updated_at: new Date().toISOString() 
    }, { onConflict: 'id' }).select().single();

    if (profileError) {
      return { id: authData.user.id, email: user.email, name: user.name, avatar: user.avatar, role: 0 };
    }

    return { 
      id: profileData.id, 
      email: profileData.email, 
      name: profileData.name, 
      avatar: profileData.avatar_url,
      role: profileData.role,
      dailyGoal: profileData.daily_goal,
      streak: profileData.streak
    };
  },

  async signIn(email: string, password: string): Promise<User | null> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
    if (!authData.user) return null;

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', authData.user.id).maybeSingle();
    
    return profileData ? { 
      id: profileData.id, 
      email: profileData.email, 
      name: profileData.name, 
      avatar: profileData.avatar_url,
      role: profileData.role,
      dailyGoal: profileData.daily_goal,
      streak: profileData.streak
    } : null;
  },

  async getAllUsers(): Promise<User[]> {
    const { data: profile, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (profile || []).map(p => ({
      id: p.id,
      email: p.email,
      name: p.name,
      avatar: p.avatar_url,
      role: p.role,
      dailyGoal: p.daily_goal,
      streak: p.streak,
      createdAt: p.created_at
    }));
  },

  async updateUserRole(userId: string, role: number): Promise<void> {
    const { error } = await supabase.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', userId);
    if (error) throw error;
  },

  async deleteUser(userId: string): Promise<void> {
    // 先删除用户的所有数据
    await supabase.from('decks').delete().eq('user_id', userId);
    await supabase.from('user_subscriptions').delete().eq('user_id', userId);
    await supabase.from('study_records').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
    // 注意：这里不删除auth.users，因为那是Supabase Auth的身份
  },

  async getUserProfile(email: string): Promise<User | null> {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
    if (profileData) return { 
      id: profileData.id, 
      email: profileData.email, 
      name: profileData.name, 
      avatar: profileData.avatar_url,
      role: profileData.role,
      dailyGoal: profileData.daily_goal,
      streak: profileData.streak
    };
    return null;
  },

  // --- STUDY TRACKING ---
  
  async logCardCompletion(userId: string, cardId: string, deckId: string): Promise<{ todayCount: number, currentStreak: number }> {
    const todayStr = new Date().toISOString().split('T')[0];

    await supabase.from('study_logs').insert({
      user_id: userId,
      card_id: cardId,
      deck_id: deckId
    });

    const { data: todayLogs } = await supabase
      .from('study_logs')
      .select('card_id')
      .eq('user_id', userId)
      .eq('created_at', todayStr);
    
    const uniqueCards = new Set((todayLogs || []).map(l => l.card_id));
    const todayCount = uniqueCards.size;

    const { data: profile } = await supabase.from('profiles')
      .select('streak, daily_goal, last_study_date')
      .eq('id', userId)
      .maybeSingle();
    
    if (!profile) return { todayCount, currentStreak: 0 };

    let nextStreak = profile.streak || 0;
    const dailyGoal = profile.daily_goal || 20;
    
    if (todayCount === dailyGoal && profile.last_study_date !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (profile.last_study_date === yesterdayStr) {
        nextStreak += 1;
      } else {
        nextStreak = 1;
      }

      await supabase.from('profiles').update({
        streak: nextStreak,
        last_study_date: todayStr
      }).eq('id', userId);
    }

    return { todayCount, currentStreak: nextStreak };
  },

  async getStudyStats(userId: string): Promise<{ todayCardIds: string[], allTimeCount: number, streak: number }> {
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const [todayRes, allTimeRes, profileRes] = await Promise.all([
        supabase.from('study_logs').select('card_id').eq('user_id', userId).eq('created_at', todayStr),
        supabase.from('study_logs').select('card_id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('profiles').select('streak').eq('id', userId).maybeSingle()
      ]);

      const todayCardIds: string[] = Array.from(new Set<string>((todayRes.data || []).map((l: any) => String(l.card_id))));
      const allTimeCount = allTimeRes.count || 0;
      const streak = profileRes.data?.streak || 0;

      return { todayCardIds, allTimeCount, streak };
    } catch (err) {
      console.error("Cloud stats fetch failed:", err);
      return { todayCardIds: [], allTimeCount: 0, streak: 0 };
    }
  },

  // --- CHALLENGE MODE ---
  
  async saveChallengeRecord(userId: string, data: {
    cardId: string;
    deckId: string;
    totalChallenges: number;
    completedChallenges: number;
    score: number;
    accuracy: number;
    timeSpent: number;
    completionPercent?: number;
  }): Promise<void> {
    console.log('Saving challenge record:', { userId, data });
    const { error } = await supabase.from('challenge_logs').insert({
      user_id: userId,
      card_id: data.cardId,
      deck_id: data.deckId,
      total_challenges: data.totalChallenges,
      completed_challenges: data.completedChallenges,
      score: data.score,
      accuracy: data.accuracy,
      time_spent: data.timeSpent,
      card_text: '',
      deck_title: '',
      completion_percent: data.completionPercent || 0
    });
    if (error) {
      console.error('Challenge record insert error:', error);
    }
  },

  async getChallengeStats(userId: string): Promise<{
    todayChallenges: number;
    totalScore: number;
    totalTime: number;
    avgAccuracy: number;
  }> {
    // 获取今天的开始和结束时间
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    try {
      const [todayRes, allTimeRes] = await Promise.all([
        supabase.from('challenge_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', todayStart)
          .lt('created_at', todayEnd),
        supabase.from('challenge_logs')
          .select('score, time_spent, accuracy')
          .eq('user_id', userId)
      ]);

      const todayChallenges = todayRes.data?.length || 0;
      const allTimeData = allTimeRes.data || [];
      
      const totalScore = allTimeData.reduce((sum, r) => sum + (r.score || 0), 0);
      const totalTime = allTimeData.reduce((sum, r) => sum + (r.time_spent || 0), 0);
      const avgAccuracy = allTimeData.length > 0 
        ? allTimeData.reduce((sum, r) => sum + (r.accuracy || 0), 0) / allTimeData.length 
        : 0;

      return { todayChallenges, totalScore, totalTime, avgAccuracy };
    } catch (err) {
      console.error("Challenge stats fetch failed:", err);
      return { todayChallenges: 0, totalScore: 0, totalTime: 0, avgAccuracy: 0 };
    }
  },

  async toggleReviewCard(cardId: string, isForReview: boolean): Promise<void> {
    const { error } = await supabase
      .from('cards')
      .update({ is_for_review: isForReview })
      .eq('id', cardId);
    if (error) throw error;
  },

  async getDetailedTodayLogs(userId: string): Promise<{ card_id: string, studied_at: string, card_text: string }[]> {
    const todayStr = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('study_logs')
      .select('card_id, studied_at, cards(text)')
      .eq('user_id', userId)
      .eq('created_at', todayStr)
      .order('studied_at', { ascending: false });
    
    if (error) {
      const { data: simpleData } = await supabase
        .from('study_logs')
        .select('card_id, studied_at')
        .eq('user_id', userId)
        .eq('created_at', todayStr)
        .order('studied_at', { ascending: false });
      return (simpleData || []).map(l => ({ 
        card_id: l.card_id, 
        studied_at: l.studied_at, 
        card_text: 'Unknown Card' 
      }));
    }

    return (data || []).map(l => ({
      card_id: l.card_id,
      studied_at: l.studied_at,
      card_text: (l.cards as any)?.text || 'Unknown'
    }));
  },

  // --- DECKS & STORE ---
  async fetchStoreDecks(): Promise<Deck[]> {
    let { data, error } = await supabase
      .from('store_decks')
      .select(`id, title, description, icon, source_text, author, user_id, created_at, updated_at, tags, origin_deck_id, subscriber_count, store_cards (*)`)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.warn("Sorting by updated_at failed, falling back to created_at:", error.message);
      const fallback = await supabase
        .from('store_decks')
        .select(`id, title, description, icon, source_text, author, user_id, created_at, updated_at, tags, origin_deck_id, subscriber_count, store_cards (*)`)
        .order('created_at', { ascending: false });
      
      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }

    return (data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      icon: d.icon,
      sourceText: d.source_text,
      author: d.author,
      createdBy: d.user_id,
      createdAt: new Date(d.created_at).getTime(),
      updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : new Date(d.created_at).getTime(),
      tags: (d.tags as any as string[]) || [],
      originDeckId: d.origin_deck_id,
      subscriberCount: d.subscriber_count || 0,
      cards: (d.store_cards || []).map((c: any) => ({
        id: c.id,
        index: c.card_index ?? 0,
        text: c.text,
        translation: c.translation,
        audioUrl: c.audio_url,
        context: c.context,
        grammarNote: c.grammar_note,
        breakdown: typeof c.breakdown === 'string' ? JSON.parse(c.breakdown || '[]') : (c.breakdown || []),
        trainingContent: typeof c.training_content === 'string' ? JSON.parse(c.training_content || '[]') : (c.training_content || []),
        voiceName: c.voice_name,
        audioDuration: c.audio_duration,
        repeatCount: c.repeat_count || 3,
        isForReview: c.is_for_review || false
      })).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
    }));
  },

  async publishToStore(deck: Deck, userId: string, userName: string): Promise<void> {
    const now = new Date().toISOString();
    const { data: existing, error: existingError } = await supabase.from('store_decks').select('id').eq('origin_deck_id', deck.id).eq('user_id', userId).maybeSingle();
    
    if (existingError) {
      console.error('Error checking existing store deck:', existingError);
      throw existingError;
    }
    
    if (existing) {
      // Update existing store deck
      const { error: updateError } = await supabase.from('store_decks').update({ 
        title: deck.title,
        description: deck.description, 
        icon: deck.icon, 
        source_text: deck.sourceText, 
        author: userName, 
        tags: deck.tags || [],
        updated_at: now
      }).eq('id', existing.id);
      
      if (updateError) {
        console.error('Error updating store deck:', updateError);
        throw updateError;
      }
      
      // Delete existing cards
      const { error: deleteError } = await supabase.from('store_cards').delete().eq('deck_id', existing.id);
      if (deleteError) {
        console.error('Error deleting store cards:', deleteError);
        throw deleteError;
      }
      
      // Insert new cards
      const cardsToInsert = deck.cards.map((card, idx) => ({ 
        deck_id: existing.id, 
        text: card.text, 
        translation: card.translation, 
        audio_url: card.audioUrl, 
        context: card.context, 
        grammar_note: card.grammarNote, 
        breakdown: card.breakdown ? JSON.stringify(card.breakdown) : null, 
        training_content: card.trainingContent ? JSON.stringify(card.trainingContent) : null,
        voice_name: card.voiceName, 
        audio_duration: card.audioDuration, 
        repeat_count: card.repeatCount || 3,
        is_for_review: card.isForReview || false,
        card_index: card.index ?? idx
      }));
      
      const { error: insertCardsError } = await supabase.from('store_cards').insert(cardsToInsert as any);
      if (insertCardsError) {
        console.error('Error inserting store cards:', insertCardsError);
        throw insertCardsError;
      }
      
      console.log('Successfully updated store deck with', deck.cards.length, 'cards');
    } else {
      // Create new store deck
      const { data: newStoreDeck, error: insertError } = await supabase.from('store_decks').insert({ 
        title: deck.title, 
        description: deck.description, 
        icon: deck.icon, 
        source_text: deck.sourceText, 
        author: userName, 
        user_id: userId, 
        origin_deck_id: deck.id, 
        tags: deck.tags || [],
        updated_at: now
      }).select().single();

      if (insertError) {
        console.error('Error inserting store deck:', insertError);
        throw insertError;
      }

      // Insert cards
      const cardsToInsert = deck.cards.map((card, idx) => ({ 
        deck_id: newStoreDeck.id, 
        text: card.text, 
        translation: card.translation, 
        audio_url: card.audioUrl, 
        context: card.context, 
        grammar_note: card.grammarNote, 
        breakdown: card.breakdown ? JSON.stringify(card.breakdown) : null, 
        training_content: card.trainingContent ? JSON.stringify(card.trainingContent) : null,
        voice_name: card.voiceName, 
        audio_duration: card.audioDuration, 
        repeat_count: card.repeatCount || 3,
        is_for_review: card.isForReview || false,
        card_index: card.index ?? idx
      }));
      
      const { error: insertCardsError } = await supabase.from('store_cards').insert(cardsToInsert as any);
      if (insertCardsError) {
        console.error('Error inserting store cards:', insertCardsError);
        throw insertCardsError;
      }
      
      console.log('Successfully created store deck with', deck.cards.length, 'cards');
    }
  },

  async saveDeck(deck: Deck, userId: string): Promise<void> {
    const now = new Date().toISOString();
    
    // 先检查卡组是否已存在
    const { data: existingDeck } = await supabase
      .from('decks')
      .select('id')
      .eq('id', deck.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingDeck) {
      // 已存在，执行更新
      const { error: updateError } = await supabase.from('decks')
        .update({
          title: deck.title,
          description: deck.description,
          icon: deck.icon,
          source_text: deck.sourceText,
          is_subscribed: deck.isSubscribed || false,
          author: deck.author,
          updated_at: now
        })
        .eq('id', deck.id)
        .eq('user_id', userId);

      if (updateError) {
        console.error("Error updating deck metadata:", updateError);
        throw updateError;
      }
    } else {
      // 不存在，执行插入
      const { error: insertError } = await supabase.from('decks').insert({
        id: deck.id,
        user_id: userId,
        title: deck.title,
        description: deck.description,
        icon: deck.icon,
        source_text: deck.sourceText,
        is_subscribed: deck.isSubscribed || false,
        author: deck.author,
        created_at: new Date(deck.createdAt).toISOString(),
        updated_at: now
      });

      if (insertError) {
        console.error("Error inserting deck metadata:", insertError);
        throw insertError;
      }
    }

    // 2. Handle card deletions
    const currentCardIds = deck.cards.map(c => c.id);
    if (currentCardIds.length > 0) {
      // Delete cards belonging to this deck that are not in the current list
      const { error: deleteError } = await supabase.from('cards')
        .delete()
        .eq('deck_id', deck.id)
        .not('id', 'in', `(${currentCardIds.join(',')})`);
      
      if (deleteError) {
        console.error("Error deleting removed cards:", deleteError);
        // We continue anyway to try and save the current cards
      }
    } else {
      // If the deck is now empty, delete all its cards
      const { error: deleteError } = await supabase.from('cards')
        .delete()
        .eq('deck_id', deck.id);
      
      if (deleteError) {
        console.error("Error deleting all cards for empty deck:", deleteError);
      }
    }

    // 3. Upsert current cards
    if (deck.cards.length > 0) {
      const cardsToInsert = deck.cards.map((card, idx) => ({ 
        id: card.id, 
        deck_id: deck.id, 
        text: card.text, 
        translation: card.translation, 
        audio_url: card.audioUrl, 
        context: card.context, 
        grammar_note: card.grammarNote, 
        breakdown: card.breakdown, 
        training_content: card.trainingContent || [],
        voice_name: card.voiceName, 
        audio_duration: card.audioDuration, 
        repeat_count: card.repeatCount || 3,
        is_for_review: card.isForReview || false,
        card_index: card.index ?? idx
      }));
      
      const { error: cardsError } = await supabase.from('cards').upsert(cardsToInsert as any, { onConflict: 'id' });
      if (cardsError) {
        console.error("Error upserting cards:", cardsError);
        throw cardsError;
      }
    }
  },

  async fetchUserDecks(userId: string): Promise<Deck[]> {
    const { data, error } = await supabase.from('decks').select(`*, cards (*)`).eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      icon: d.icon,
      sourceText: d.source_text,
      isSubscribed: d.is_subscribed,
      author: d.author,
      createdBy: d.user_id,
      createdAt: new Date(d.created_at).getTime(),
      updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : new Date(d.created_at).getTime(),
      tags: (d.tags as any as string[]) || [],
      cards: (d.cards || []).map((c: any) => ({
        id: c.id,
        text: c.text,
        translation: c.translation,
        audioUrl: c.audio_url,
        context: c.context,
        grammarNote: c.grammar_note,
        breakdown: typeof c.breakdown === 'string' ? JSON.parse(c.breakdown || '[]') : (c.breakdown || []),
        trainingContent: typeof c.training_content === 'string' ? JSON.parse(c.training_content || '[]') : (c.training_content || []),
        voiceName: c.voice_name, 
        index: c.card_index ?? 0,
        audioDuration: c.audio_duration, 
        repeatCount: c.repeat_count || 3,
        isForReview: c.is_for_review || false
      })).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
    }));
  },

  async deleteDeck(deckId: string, userId: string): Promise<void> {
    // 1. 先获取要删除的卡组标题
    const { data: deckToDelete } = await supabase
      .from('decks')
      .select('title')
      .eq('id', deckId)
      .single();
    
    // 2. 删除卡片
    await supabase.from('cards').delete().eq('deck_id', deckId);
    // 3. 删除卡组
    await supabase.from('decks').delete().eq('id', deckId);
    
    // 4. 尝试删除订阅关系 - 通过标题匹配
    if (deckToDelete?.title) {
      // 找到对应标题的商店卡组
      const { data: storeDeck } = await supabase
        .from('store_decks')
        .select('id')
        .eq('title', deckToDelete.title)
        .maybeSingle();
      
      if (storeDeck) {
        // 删除订阅关系（触发 subscriber_count -1）
        await supabase
          .from('store_deck_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('store_deck_id', storeDeck.id);
      }
    }
  },

  async uploadAudio(cardId: string, base64Audio: string): Promise<string | null> {
    const isMp3 = base64Audio.includes('audio/mpeg');
    const base64Data = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
    const binary = atob(base64Data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    const mimeType = isMp3 ? 'audio/mpeg' : 'audio/wav';
    const fileName = `${cardId}_${Date.now()}${isMp3 ? '.mp3' : '.wav'}`;
    await supabase.storage.from('card-audio').upload(fileName, new Blob([array], { type: mimeType }), { contentType: mimeType, cacheControl: '3600', upsert: true });
    const { data: urlData } = supabase.storage.from('card-audio').getPublicUrl(fileName);
    return urlData.publicUrl;
  },

  async updateStoreDeckMetadata(deckId: string, metadata: any): Promise<void> {
    await supabase.from('store_decks').update({ 
      title: metadata.title, 
      description: metadata.description, 
      icon: metadata.icon, 
      tags: metadata.tags,
      updated_at: new Date().toISOString()
    }).eq('id', deckId);
  },

  async deleteStoreDeck(deckId: string): Promise<void> {
    await supabase.from('store_cards').delete().eq('deck_id', deckId);
    await supabase.from('store_decks').delete().eq('id', deckId);
  },

  async seedStoreData(mockDecks: Deck[]): Promise<void> {
    for (const deck of mockDecks) {
      try {
        const { data: existing } = await supabase.from('store_decks').select('id').eq('title', deck.title).maybeSingle();
        if (existing) continue;
        const now = new Date().toISOString();
        const { data: newDeck, error: insertError } = await supabase.from('store_decks').insert({ 
          title: deck.title, 
          description: deck.description, 
          icon: deck.icon, 
          source_text: deck.sourceText, 
          author: deck.author, 
          tags: deck.tags || [],
          updated_at: now
        }).select().single();

        if (insertError) {
           console.warn("Seed insert failed, skipping:", deck.title);
           continue;
        }

        const cardsToInsert = deck.cards.map((card, idx) => ({ 
          deck_id: newDeck.id, 
          text: card.text, 
          translation: card.translation, 
          audio_url: card.audioUrl, 
          context: card.context, 
          grammar_note: card.grammarNote, 
          breakdown: card.breakdown, 
          voice_name: card.voiceName, 
          audio_duration: card.audioDuration, 
          repeat_count: card.repeatCount || 3,
          is_for_review: card.isForReview || false,
          card_index: card.index ?? idx
        }));
        await supabase.from('store_cards').insert(cardsToInsert as any);
      } catch (err: any) {
        console.error("Seed failed for:", deck.title, err);
      }
    }
  },

  // 新订阅系统：订阅商店卡组
  async subscribeToStoreDeck(storeDeckId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 1. 检查是否已订阅
      const { data: existing } = await supabase
        .from('store_deck_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('store_deck_id', storeDeckId)
        .maybeSingle();

      if (existing) {
        return { success: false, message: '已经订阅过此卡组' };
      }

      // 2. 插入订阅记录（触发 subscriber_count +1）
      const { error: subError } = await supabase
        .from('store_deck_subscriptions')
        .insert({
          user_id: userId,
          store_deck_id: storeDeckId
        });

      if (subError) {
        console.error('订阅失败:', subError);
        return { success: false, message: `订阅失败: ${subError.message}` };
      }

      return { success: true, message: '订阅成功' };
    } catch (err: any) {
      console.error('订阅异常:', err);
      return { success: false, message: `异常: ${err.message}` };
    }
  },

  // 新订阅系统：取消订阅
  async unsubscribeFromStoreDeck(storeDeckId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error: subError } = await supabase
        .from('store_deck_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('store_deck_id', storeDeckId);

      if (subError) {
        console.error('取消订阅失败:', subError);
        return { success: false, message: `取消订阅失败: ${subError.message}` };
      }

      return { success: true, message: '取消订阅成功' };
    } catch (err: any) {
      console.error('取消订阅异常:', err);
      return { success: false, message: `异常: ${err.message}` };
    }
  },

  // 获取用户已订阅的商店卡组ID列表
  async getUserSubscriptions(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('store_deck_subscriptions')
      .select('store_deck_id')
      .eq('user_id', userId);

    if (error) {
      console.error('获取订阅列表失败:', error);
      return [];
    }

    return (data || []).map(d => d.store_deck_id);
  },

  // 测试函数：插入测试数据到 cards 和 decks 表
  async insertTestData(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const testDeckId = `test-deck-${Date.now()}`;
      const now = new Date().toISOString();

      // 1. 先测试查询
      const { data: existingDecks, error: queryError } = await supabase
        .from('decks')
        .select('id, title, user_id')
        .limit(3);

      console.log('查询现有卡组:', existingDecks);
      if (queryError) {
        return { success: false, message: `查询失败: ${queryError.message}` };
      }

      // 2. 尝试插入测试卡组
      const { error: deckError } = await supabase.from('decks').insert({
        id: testDeckId,
        user_id: userId,
        title: '测试卡组',
        description: '这是用于测试的卡组',
        icon: '📚',
        is_subscribed: true,
        author: '测试用户',
        created_at: now,
        updated_at: now
      });

      if (deckError) {
        console.error('插入测试卡组失败:', deckError);
        return { success: false, message: `插入卡组失败: ${deckError.message}` };
      }

      // 3. 插入测试卡片
      const testCards = [
        {
          id: `test-card-1-${Date.now()}`,
          deck_id: testDeckId,
          text: 'Hello',
          translation: '你好',
          context: '常用问候语',
          grammar_note: '名词',
          repeat_count: 3,
          is_for_review: false,
          card_index: 0
        }
      ];

      const { error: cardsError } = await supabase.from('cards').insert(testCards as any);

      if (cardsError) {
        console.error('插入测试卡片失败:', cardsError);
        // 清理：删除已插入的卡组
        await supabase.from('decks').delete().eq('id', testDeckId);
        return { success: false, message: `插入卡片失败: ${cardsError.message}` };
      }

      return { success: true, message: `测试数据插入成功！卡组ID: ${testDeckId}` };
    } catch (err: any) {
      console.error('测试数据插入异常:', err);
      return { success: false, message: `异常: ${err.message}` };
    }
  }
};
