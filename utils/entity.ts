import axios from 'axios';

import { Entity, EntityService } from 'types/entity';
import { ImpactToken, ImpactTokenBatch, ImpactTokensByAddress } from 'types/wallet';
import { toJsonString } from './misc';

export const getAdditionalInfo = async (url: string, tag?: string) => {
  console.log(`getAdditionalInfo::${tag}`, url);
  const api = axios.create({
    baseURL: url,
  });
  const res = await api.get('');
  if (res.status > 299 || res.status < 200) {
    console.error('getAdditionalInfo::', res.data);
    throw res.data;
  }
  return res.data;
};

export const getServiceEndpoint = (url = '', services: EntityService[] = []) => {
  // if url includes :// it means it already an https link most probably
  if (url.includes('://')) return url;

  const pos = url.indexOf(':');
  if (pos === -1) return url;

  const service = url.substring(0, pos);
  const endUrl = url.substring(pos + 1);

  const serviceEndpoint = services.find((s) => {
    const posHash = s.id!.indexOf('#');
    const id = s.id!.substring(posHash + 1);
    return id === service;
  })?.serviceEndpoint;
  if (!serviceEndpoint) return url;

  return serviceEndpoint + endUrl;
};

export const fetchEntityProfile = async (entity: Entity, stringifyResult = true) => {
  try {
    const profileServiceEndpoint = entity?.settings?.Profile?.serviceEndpoint;
    if (!profileServiceEndpoint) throw new Error(`Settings for 'Profile' not found (${entity?.id})`);
    const profile = await getAdditionalInfo(getServiceEndpoint(profileServiceEndpoint, entity.service), 'profile');
    return stringifyResult ? toJsonString(profile) : profile;
  } catch (error) {
    console.error('getEntityProfileData', error);
    return undefined;
  }
};

export const determineTokensSend = (tokens: ImpactTokenBatch[], amount: number) => {
  let required = amount;
  const offsetTokens: ImpactToken[] = [];
  tokens
    .sort((a, b) => Number(b?.amount ?? 0) - Number(a?.amount ?? 0))
    .forEach((t) => {
      if (required === 0 || !Number(t?.amount ?? 0)) return;
      const offset = Number(t?.amount ?? 0) >= required ? required : Number(t?.amount ?? 0);
      required -= offset;
      offsetTokens.push({ id: t.tokenId, amount: String(offset) });
    });
  return offsetTokens;
};

export const countCarbon = (tokens: ImpactTokenBatch[]) =>
  (tokens ?? [])?.reduce((acc, t) => acc + Number(t?.amount ?? 0), 0) ?? 0;

export const countUserCarbon = (carbonTokens: ImpactTokensByAddress) => {
  const tokens = Object.values(carbonTokens ?? {})
    ?.map((t) => t.tokens)
    ?.flat();
  if (!Array.isArray(tokens) || !tokens?.length) return 0;
  return countCarbon(tokens);
};

export const extractEntityName = (entity: Entity) => {
  const number = entity?.alsoKnownAs?.split('#')?.[1];
  let name = `SupaMoto #${number}`;
  const profile = typeof entity.profile === 'string' ? JSON.parse(entity.profile) : entity.profile;
  if (profile?.brand) name = `${profile.brand} #${number}`;
  return name;
};

export const extractEntityType = (entity: Entity) => {
  const profile = typeof entity.profile === 'string' ? JSON.parse(entity.profile) : entity.profile;
  if (profile?.name) return profile?.name;
  return 'SupaMoto';
};
