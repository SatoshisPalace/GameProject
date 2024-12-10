import ArweaveTransaction from 'arweave/node/lib/transaction';

declare module 'arconnect' {
    interface Transaction extends ArweaveTransaction {
        format: number;
        id: string;
        last_tx: string;
        owner: string;
        tags: Tag[];
        target: string;
        quantity: string;
        data: string;
        data_size: string;
        data_root: string;
        reward: string;
        signature: string;
        addTag: (name: string, value: string) => void;
    }

    interface Tag {
        name: string;
        value: string;
    }

    interface TransactionEdge {
        node: {
            id: string;
            tags: Tag[];
        };
    }

    interface GraphQLResponse {
        data: {
            transactions: {
                edges: TransactionEdge[];
            };
        };
    }

    interface ArweaveWalletApi {
        connect: (permissions: string[]) => Promise<void>;
        disconnect: () => Promise<void>;
        getActiveAddress: () => Promise<string>;
        getPermissions: () => Promise<string[]>;
        sign: (transaction: Transaction) => Promise<Transaction>;
        dispatch: (transaction: Transaction) => Promise<{ id: string }>;
    }
}

declare global {
    interface Window {
        arweaveWallet: ArweaveWalletApi;
    }
}
