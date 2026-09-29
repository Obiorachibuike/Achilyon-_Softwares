// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Test-only WETH9 equivalent.
contract TestWETH {
    string public constant name = "Wrapped Ether";
    string public constant symbol = "WETH";
    uint8 public constant decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Transfer(address(0), msg.sender, msg.value);
    }

    function withdraw(uint256 wad) external {
        balanceOf[msg.sender] -= wad;
        (bool ok,) = msg.sender.call{value: wad}("");
        require(ok, "ETH transfer failed");
        emit Transfer(msg.sender, address(0), wad);
    }

    function totalSupply() external view returns (uint256) {
        return address(this).balance;
    }

    function approve(address spender, uint256 wad) external returns (bool) {
        allowance[msg.sender][spender] = wad;
        emit Approval(msg.sender, spender, wad);
        return true;
    }

    function transfer(address to, uint256 wad) external returns (bool) {
        return transferFrom(msg.sender, to, wad);
    }

    function transferFrom(address from, address to, uint256 wad) public returns (bool) {
        if (from != msg.sender && allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= wad;
        }
        balanceOf[from] -= wad;
        balanceOf[to] += wad;
        emit Transfer(from, to, wad);
        return true;
    }

    receive() external payable {
        deposit();
    }
}
