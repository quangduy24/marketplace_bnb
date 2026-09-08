
import { COMMERCE_ABI } from './lib/chain.ts';
console.log(COMMERCE_ABI.map(x => x.name || x.type).filter(x => x !== 'error' && x !== 'event'));

