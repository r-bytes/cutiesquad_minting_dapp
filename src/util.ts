/**
 * Wait transactions to be mined.
 *
 * Based on https://raw.githubusercontent.com/Kaisle/await-transaction-mined/master/index.js
 */

import Web3 from 'web3';

const DEFAULT_INTERVAL = 500;

const DEFAULT_BLOCKS_TO_WAIT = 0;

interface Options {
    interval: number;
    blocksToWait: number;
}

/**
 * Wait for one or multiple transactions to confirm.
 *
 * @param web3
 * @param txnHash A transaction hash or list of those
 * @param interval how often to check
 * @param blocksToWait how long to wait in blocks
 * @return Transaction receipt
 */
export function waitTransaction(web3: Web3, txnHash: string|string[], interval: number, blocksToWait: number): Promise<any> {
    var transactionReceiptAsync = async function(txnHash: string, resolve : any, reject: any) {
        try {
            var receipt = web3.eth.getTransactionReceipt(txnHash);
            if (!receipt) {
                setTimeout(function () {
                    transactionReceiptAsync(txnHash, resolve, reject);
                }, interval);
            } else {
                if (blocksToWait > 0) {
                    var resolvedReceipt = await receipt;
                    if (!resolvedReceipt || !resolvedReceipt.blockNumber) setTimeout(function () { transactionReceiptAsync(txnHash, resolve, reject);
                    }, interval);
                    else {
                        try {
                            var block = await web3.eth.getBlock(resolvedReceipt.blockNumber)
                            var current = await web3.eth.getBlock('latest');
                            if (current.number - block.number >= blocksToWait) {
                                var txn = await web3.eth.getTransaction(txnHash)
                                if (txn.blockNumber != null) resolve(resolvedReceipt);
                                else reject(new Error('Transaction with hash: ' + txnHash + ' ended up in an uncle block.'));
                            }
                            else setTimeout(function () {
                                transactionReceiptAsync(txnHash, resolve, reject);
                            }, interval);
                        }
                        catch (e) {
                            setTimeout(function () {
                                transactionReceiptAsync(txnHash, resolve, reject);
                            }, interval);
                        }
                    }
                }
                else resolve(receipt);
            }
        } catch(e) {
            reject(e);
        }
    };

    // Resolve multiple transactions once
    if (Array.isArray(txnHash)) {
        var promises : any[] = [];
        txnHash.forEach(function (oneTxHash) {
            promises.push(waitTransaction(web3, oneTxHash, interval, blocksToWait));
        });
        return Promise.all(promises);
    } else {
        return new Promise(function (resolve, reject) {
            transactionReceiptAsync(txnHash, resolve, reject);
        });
    }
};