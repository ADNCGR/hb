import { useOutletContext } from 'react-router-dom';
import type { ActifListItem } from '@/api/types';

export const useActifCtx = () => useOutletContext<ActifListItem>();
