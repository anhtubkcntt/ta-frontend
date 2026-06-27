import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';

export const exportSupabaseDataToExcel = async (startDate, endDate) => {
  try {
    const fetchAllWithFilter = async (table, dateColumn, isDateOnly = false) => {
      let query = supabase.from(table).select('*');
      
      if (startDate) {
        query = query.gte(dateColumn, startDate);
      }
      if (endDate) {
        // if dateColumn is timestamp, we might need to include the end of the day
        const endStr = isDateOnly ? endDate : `${endDate}T23:59:59.999Z`;
        query = query.lte(dateColumn, endStr);
      }
      
      // We will loop to fetch all records in case there are > 1000
      let allData = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        
        allData = [...allData, ...data];
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
      return allData;
    };

    // Profiles don't really need date filtering for backup, fetch all
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) throw pError;

    const tasks = await fetchAllWithFilter('tasks', 'created_at');
    const reports = await fetchAllWithFilter('daily_reports', 'report_date', true);
    const notifications = await fetchAllWithFilter('notifications', 'created_at');
    const metrics = await fetchAllWithFilter('task_recruitment_metrics', 'created_at');

    const workbook = XLSX.utils.book_new();

    const addSheet = (data, sheetName) => {
      if (!data || data.length === 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Message: "No data available" }]), sheetName);
        return;
      }
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    };

    addSheet(tasks, 'Tasks');
    addSheet(reports, 'Daily Reports');
    addSheet(profiles, 'Profiles');
    addSheet(notifications, 'Notifications');
    addSheet(metrics, 'Recruitment Metrics');

    const fileName = `TaskFlow_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    return { success: true };
  } catch (error) {
    console.error("Export Error:", error);
    return { success: false, error: error.message };
  }
};
