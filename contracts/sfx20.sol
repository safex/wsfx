//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0; // solhint-disable-line

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract WSFX is
    Initializable,
    ERC20Upgradeable,
    AccessControlEnumerableUpgradeable,
    PausableUpgradeable
{
    /// @dev Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant PROXY_ROLE = keccak256("PROXY_ROLE");

    string public sfxDepositViewKey;
    string public sfxDepositPublicAddress;
    string public sfxSpendViewKey;
    string public sfxSpendPublicAddress;
    string public sfxColdViewKey;
    string public sfxColdPublicAddress;

    /// @dev Events
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed account, uint256 amount);

    function initialize(
        string memory depositKey,
        string memory depositAddress,
        string memory spendKey,
        string memory spendAddress,
        string memory coldKey,
        string memory coldAddress
    ) public initializer {
        __ERC20_init("Wrapped Safex Cash", "WSFX");
        __AccessControlEnumerable_init();
        __Pausable_init();

        sfxDepositViewKey = depositKey;
        sfxDepositPublicAddress = depositAddress;
        sfxSpendViewKey = spendKey;
        sfxSpendPublicAddress = spendAddress;
        sfxColdViewKey = coldKey;
        sfxColdPublicAddress = coldAddress;

        // grant the admin, minter and pauser role to contract deployer
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(BURNER_ROLE, msg.sender);
        _setupRole(PROXY_ROLE, msg.sender);
    }

    function setDepositPublicAddress(string memory depositAddress)
        external
        returns (bool)
    {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Caller is not the default admin"
        );
        sfxDepositPublicAddress = depositAddress;
        return true;
    }

    function setSpendPublicAddress(string memory spendAddress)
        external
        returns (bool)
    {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Caller is not the default admin"
        );
        sfxSpendPublicAddress = spendAddress;
        return true;
    }

    function setColdPublicAddress(string memory coldAddress)
        external
        returns (bool)
    {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Caller is not the default admin"
        );
        sfxColdPublicAddress = coldAddress;
        return true;
    }

    /// @notice Add a new Proxy
    /// @dev Access restricted only for Admin role
    /// @param account Address of the new Proxy
    function addProxy(address account) external returns (bool) {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Caller is not the default admin"
        );
        require(account != address(0), "Account is the zero address");
        grantRole(PROXY_ROLE, account);
        return true;
    }

    /// @notice Remove a Proxy
    /// @dev Access restricted only for Default Admin
    /// @param account Address of the Proxy
    function removeProxy(address account) external returns (bool) {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Caller is not the default admin"
        );
        revokeRole(PROXY_ROLE, account);
        return true;
    }

    /// @notice Add a new Minter
    /// @dev Access restricted only for Proxy role
    /// @param account Address of the new Minter
    function addMinter(address account) external returns (bool) {
        require(
            hasRole(PROXY_ROLE, msg.sender),
            "Caller is not the proxy"
        );
        require(account != address(0), "Account is the zero address");
        grantRole(MINTER_ROLE, account);
        return true;
    }

    /// @notice Remove a Minter
    /// @dev Access restricted only for Proxy
    /// @param account Address of the Minter
    function removeMinter(address account) external returns (bool) {
        require(
            hasRole(PROXY_ROLE, msg.sender),
            "Caller is not the proxy"
        );
        revokeRole(MINTER_ROLE, account);
        return true;
    }

    function mint(address to, uint256 amount) external returns (bool) {
        // check if the caller has the minter role
        require(
            hasRole(MINTER_ROLE, msg.sender),
            "Caller is not a minter"
        );
        require(amount > 0, "WSFX: amount is zero");
        _mint(to, amount);
        emit Minted(to, amount);
        return true;
    }

    function burn(uint256 amount) external returns (bool) {
        // check if the caller has the burner role
        require(
            hasRole(BURNER_ROLE, msg.sender),
            "Caller is not a burner"
        );
        require(amount > 0, "WSFX: amount is zero");
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
        return true;
    }

    /// @notice Pause all the functions
    /// @dev the caller must have the 'PAUSER_ROLE'
    function pause() external {
        require(
            hasRole(PAUSER_ROLE, msg.sender),
            "Must have pauser role to pause"
        );
        _pause();
    }

    /// @notice Unpause all the functions
    /// @dev the caller must have the 'PAUSER_ROLE'
    function unpause() external {
        require(
            hasRole(PAUSER_ROLE, msg.sender),
            "Must have pauser role to unpause"
        );
        _unpause();
    }

    /// @notice Hook to pause _mint(), _transfer() and _burn()
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(to != address(this), "Transfer to the token contract");
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "Token transfer while paused");
    }
}
