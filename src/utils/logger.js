import { supabase } from '../supabaseClient';

export const logActivity = async (userId, actionType, entity, details) => {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert([
        {
          user_id: userId,
          action_type: actionType,
          entity: entity,
          details: details
        }
      ]);
      
    if (error) {
      console.error('Error logging activity:', error.message);
    }
  } catch (err) {
    console.error('Activity logger exception:', err.message);
  }
};
