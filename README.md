# WSFX (Wrapped Safex Cash)

This is an Ethereum smart contract for ERC20 token representing Wrapped Safex Cash.

- Smart contract is written in Solidity.
- We use [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) library for secure contracts.
- We use Hardhat library for local development, compilataion, testing and deployments.

## Development

```bash
# install dependencies
npm install
```

```bash
# list seeded accounts
npx hardhat accounts
```

```bash
# compile contract
npx hardhat compile
```

```bash
# run tests
npx hardhat test
```

### Deploy on local blockchain
```bash
# start local blockchain
npx hardhat node

# deploy contract to local blockchain
npx hardhat run –network localhost scripts/deploy.js
```

### Interacting with the contract
#### CLI
You can interact with the contract through [CLI](https://github.com/safex/erc20cli) project
#### Console
Run *npx hardhat console*

In the console, we can connect to the deployed contract:
```bash
const Sfx = require('./artifacts/contracts/wsfx.sol/WSFX')
const provider = ethers.providers.getDefaultProvider('http://127.0.0.1:8545')
let contract = new ethers.Contract(contractAddress, Sfx.abi, provider)
# now we can execute read-only operations
await contract.name();
await contract.sfx_deposit_view_ket();

# to execute 'write' methods we need to make transactions
# for that we need a signer
const signer1 = await provider.getSigner('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266')

# this time we conect to contract with a signer
contract = new ethers.Contract('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', Sfx.abi, signer1)

# and we can execute write methods
await contract.addMinter(signer1)

```

### Upgrade contract

Upgrade allows us to change the contract code, while preserving the state, balance, and address.

For upgrades we use `@openzeppelin/hardhat-upgrades` plugin.
This implements a proxy pattern in which we deploy original contract and a proxy contract. User invokes functions on a proxy contract, which keeps state and a pointer to original (implementation) contract. Proxy contract delegates the call to the implementation one. We upgrade the implementation contract by deploying a new contract and changing the pointer in proxy contract.
