import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { postJson } from '../fetchUtil';
import { FilterRequest } from '../models/filterRequest';
import { Song } from '../models/song';
import { useFilters, useTagFilters } from './useStore';

const getSongs = async (_: string, filters: FilterRequest, tagFilters: number[]) => {
  let res = await postJson<Song[]>('/songs', { ...filters, tagIds: tagFilters });
  console.log(res.length);
  return res;
};

export const useSongs = () => {
  const { filters } = useFilters();
  const { tagFilters } = useTagFilters();
  console.log(filters, tagFilters);
  return useQuery(['songs', filters, tagFilters], getSongs, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};

// export const useSongs = () => {
//   let { isLoading, error, data } = useSongsHelper();
//   if (data === undefined) {
//     console.log('undefined');
//     data = [];
//   }
//   return { isLoading, error, data };
// };
