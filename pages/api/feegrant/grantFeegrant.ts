import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

import { CHAIN_NETWORK_TYPE } from 'types/chain';

const FEEGRANT_URLS: Record<CHAIN_NETWORK_TYPE, string> = {
  mainnet: 'https://feegrant.ixo.world',
  testnet: 'https://feegrant.testnet.ixo.earth',
  devnet: 'https://feegrant.devnet.ixo.earth',
};

async function grantFeegrant(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { address, chainNetwork } = req.body;

    if (!address?.length) throw new Error('No address provided to grant feegrant.');
    if (!chainNetwork?.length) throw new Error('No chainNetwork provided to grant feegrant.');

    const feegrantAPI = axios.create({
      baseURL: FEEGRANT_URLS[chainNetwork],
      headers: { Authorization: process.env.NEXT_PRIVATE_FEEGRANT_API }, // will generate token for you shortly
    });

    const resp = await feegrantAPI.post(`/feegrant/${address}`, {});

    if ((resp.data as any).code !== 0) throw new Error('Feegrant message unsuccessful');

    res.status(200).json(resp.data);
  } catch (error) {
    res.status(500).json({ error: (error as { message: string }).message });
  }
  res.end();
}

export default grantFeegrant;
