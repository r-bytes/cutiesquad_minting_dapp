// constants
import Web3EthContract from "web3-eth-contract";
import Web3 from "web3";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
// log
import {fetchData} from "../data/dataActions";

const connectRequest = () => {
    return {
        type: "CONNECTION_REQUEST",
    };
};

const connectSuccess = (payload) => {
    return {
        type: "CONNECTION_SUCCESS",
        payload: payload,
    };
};

const connectFailed = (payload) => {
    return {
        type: "CONNECTION_FAILED",
        payload: payload,
    };
};

const updateAccountRequest = (payload) => {
    return {
        type: "UPDATE_ACCOUNT",
        payload: payload,
    };
};

export const connect = () => {
    return async (dispatch) => {
        dispatch(connectRequest());
        const abiResponse = await fetch("/CSMTF/config/abi.json", {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        const abi = await abiResponse.json();
        const configResponse = await fetch("/CSMTF/config/config.json", {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        const CONFIG = await configResponse.json();
        try {
            const providerOptions = {
                // Example with WalletConnect provider
                walletconnect: {
                    package: WalletConnectProvider,
                    options: {
                        rpc: {
                            137: "https://polygon-mainnet.g.alchemy.com/v2/XSmh1jwhlAmlGZgF3pqlY7wTYkNsJBDM",
                        },
                    }
                },
            };
            const web3Modal = new Web3Modal({
                network: "matic",
                cacheProvider: true,
                providerOptions
            });

            const provider = await web3Modal.connect();

            Web3EthContract.setProvider(provider);
            let web3 = new Web3(provider);
            try {
                const accounts = await provider.request({
                    method: "eth_requestAccounts",
                });
                const networkId = await provider.request({
                    method: "net_version",
                });
                if (networkId == CONFIG.NETWORK.ID) {
                    const SmartContractObj = new Web3EthContract(
                        abi,
                        CONFIG.CONTRACT_ADDRESS
                    );
                    dispatch(
                        connectSuccess({
                            account: accounts[0],
                            smartContract: SmartContractObj,
                            web3: web3,
                        })
                    );
                    // Add listeners start
                    provider.on("accountsChanged", (accounts) => {
                        dispatch(updateAccount(accounts[0]));
                    });
                    provider.on("chainChanged", () => {
                        window.location.reload();
                    });
                    // Add listeners end
                } else {
                    dispatch(connectFailed(`Change network to ${CONFIG.NETWORK.NAME}.`));
                }
            } catch (err) {
                dispatch(connectFailed("Something went wrong."));
            }
        } catch (err) {
            dispatch(connectFailed("Connecting to your wallet failed."));
            web3Modal.clearCachedProvider();
        }
    };
};

export const updateAccount = (account) => {
    return async (dispatch) => {
        dispatch(updateAccountRequest({account: account}));
        dispatch(fetchData(account));
    };
};
