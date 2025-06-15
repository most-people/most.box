// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract IPv6Contract {
    // 使用mapping将每个地址对应到一个名字
    mapping(address => string) private ipv6s;

    // 设置名字的函数
    function setIPv6(string calldata ipv6) external {
        ipv6s[msg.sender] = ipv6;
    }

    // 获取名字的函数
    function getIPv6() external view returns (string memory) {
        return ipv6s[msg.sender];
    }

    // 获取特定地址的名字
    function getIPv6Of(address user) external view returns (string memory) {
        return ipv6s[user];
    }
}
