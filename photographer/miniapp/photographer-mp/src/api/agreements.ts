import { request } from './client';
import { AgreementContent } from '@/types';

export const getAgreement = (
  type: 'user' | 'photographer' | 'service_commitment'
) => request<AgreementContent>({ url: `/agreements/${type}` });

export const acceptUserAgreement = (version: string) =>
  request<{ ok: boolean; accepted_version: string }>({
    url: '/agreements/user/accept',
    method: 'POST',
    data: { version },
  });
