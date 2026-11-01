'use server';

import type { Database } from '../supabase/types';
import { cache } from 'react';
import { createClient } from '@/supabase/server';
import { getFolderPath } from './getFolderPath';

export type DatabaseFolder =
  Database['public']['Tables']['source_folders']['Row'];
export type DatabaseSource = Database['public']['Tables']['sources']['Row'];

export const getSources = cache(async (databaseId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sources')
    .select('*')
    .eq('database_id', databaseId);
  return data ?? [];
});

export const getSourcesInFolder = cache(
  async (databaseId: string, folderId?: string) => {
    const supabase = await createClient();

    let sourcesQuery = supabase
      .from('sources')
      .select()
      .eq('database_id', databaseId);
    if (folderId) {
      sourcesQuery = sourcesQuery.eq('source_folder_id', folderId);
    } else {
      sourcesQuery = sourcesQuery.is('source_folder_id', null);
    }

    let foldersQuery = supabase
      .from('source_folders')
      .select()
      .eq('database_id', databaseId);
    if (folderId) {
      foldersQuery = foldersQuery.eq('parent_folder_id', folderId);
    } else {
      foldersQuery = foldersQuery.is('parent_folder_id', null);
    }

    const [{ data: sources }, { data: folders }, path] = await Promise.all([
      sourcesQuery,
      foldersQuery,
      getFolderPath(folderId),
    ]);

    return {
      folders: folders ?? [],
      path,
      sources: sources ?? [],
    };
  },
);
