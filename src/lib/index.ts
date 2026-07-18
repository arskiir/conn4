import type { Identity } from 'spacetimedb';
import type { SubscriptionHandle } from '../module_bindings';

// place files you want to import through the `$lib` alias in this folder.
export type { SubscriptionHandle };

export type You = { name?: string; identity: Identity };
