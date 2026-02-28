
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
      .select(`id, title, description, icon, source_text, author, user_id, created_at, updated_at, tags, origin_deck_id, store_cards (*)`)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.warn("Sorting by updated_at failed, falling back to created_at:", error.message);
      const fallback = await supabase
        .from('store_decks')
        .select(`id, title, description, icon, source_text, author, user_id, created_at, updated_at, tags, origin_deck_id, store_cards (*)`)
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
      cards: (d.store_cards || []).map((c: any) => ({
        id: c.id,
        text: c.text,
        translation: c.translation,
        audioUrl: c.audio_url,
        context: c.context,
        grammarNote: c.grammar_note,
        breakdown: c.breakdown,
        trainingContent: c.training_content || [],
        voiceName: c.voice_name,
        audioDuration: c.audio_duration,
        repeatCount: c.repeat_count || 3,
        isForReview: c.is_for_review || false
      })).sort((a: any, b: any) => a.id.localeCompare(b.id))
    }));
  },

  async publishToStore(deck: Deck, userId: string, userName: string): Promise<void> {
    const now = new Date().toISOString();
    const { data: existing } = await supabase.from('store_decks').select('id').eq('origin_deck_id', deck.id).eq('user_id', userId).maybeSingle();
    
    if (existing) {
      await supabase.from('store_decks').update({ 
        description: deck.description, 
        icon: deck.icon, 
        source_text: deck.sourceText, 
        author: userName, 
        tags: deck.tags || [],
        updated_at: now
      }).eq('id', existing.id);
      
      await supabase.from('store_cards').delete().eq('deck_id', existing.id);
      const cardsToInsert = deck.cards.map(card => ({ 
        deck_id: existing.id, 
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
        is_for_review: card.isForReview || false
      }));
      await supabase.from('store_cards').insert(cardsToInsert as any);
    } else {
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

      if (insertError) throw insertError;

      const cardsToInsert = deck.cards.map(card => ({ 
        deck_id: newStoreDeck.id, 
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
        is_for_review: card.isForReview || false
      }));
      await supabase.from('store_cards').insert(cardsToInsert as any);
    }
  },

  async saveDeck(deck: Deck, userId: string): Promise<void> {
    const now = new Date().toISOString();
    
    // 1. Update deck metadata
    const { error: deckError } = await supabase.from('decks').upsert({ 
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

    if (deckError) {
      console.error("Error saving deck metadata:", deckError);
      throw deckError;
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
      const cardsToInsert = deck.cards.map(card => ({ 
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
        is_for_review: card.isForReview || false
      }));
      
      const { error: cardsError } = await supabase.from('cards').upsert(cardsToInsert as any);
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
        breakdown: c.breakdown,
        trainingContent: c.training_content || [],
        voiceName: c.voice_name, 
        audioDuration: c.audio_duration, 
        repeatCount: c.repeat_count || 3,
        isForReview: c.is_for_review || false
      })).sort((a: any, b: any) => a.id.localeCompare(b.id))
    }));
  },

  async deleteDeck(deckId: string): Promise<void> {
    await supabase.from('cards').delete().eq('deck_id', deckId);
    await supabase.from('decks').delete().eq('id', deckId);
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

        const cardsToInsert = deck.cards.map(card => ({ 
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
          is_for_review: card.isForReview || false
        }));
        await supabase.from('store_cards').insert(cardsToInsert as any);
      } catch (err: any) {
        console.error("Seed failed for:", deck.title, err);
      }
    }
  }
};
