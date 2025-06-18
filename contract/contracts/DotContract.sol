// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UserRegistry {
    struct User {
        string name;
        string[] apis;
        string[] cids;
        uint256 updatedAt;
    }

    mapping(address => User) public users;
    address[] public userList;
    mapping(address => bool) public exists;

    // 添加限制常量
    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant MAX_ARRAY_LENGTH = 50;
    uint256 public constant MAX_STRING_LENGTH = 100;

    event UserUpdated(address indexed user, uint256 timestamp);

    function setUser(
        string calldata name,
        string[] calldata apis,
        string[] calldata cids
    ) external {
        // 验证输入长度
        require(bytes(name).length <= MAX_NAME_LENGTH, "Name too long");
        require(apis.length <= MAX_ARRAY_LENGTH, "Too many APIs");
        require(cids.length <= MAX_ARRAY_LENGTH, "Too many CIDs");

        // 验证数组元素长度
        for (uint i = 0; i < apis.length; i++) {
            require(
                bytes(apis[i]).length <= MAX_STRING_LENGTH,
                "API string too long"
            );
        }
        for (uint i = 0; i < cids.length; i++) {
            require(
                bytes(cids[i]).length <= MAX_STRING_LENGTH,
                "CID string too long"
            );
        }

        if (!exists[msg.sender]) {
            userList.push(msg.sender);
            exists[msg.sender] = true;
        }

        users[msg.sender] = User({
            name: name,
            apis: apis,
            cids: cids,
            updatedAt: block.timestamp
        });

        emit UserUpdated(msg.sender, block.timestamp);
    }

    function getUser(
        address user
    )
        external
        view
        returns (
            string memory name,
            string[] memory apis,
            string[] memory cids,
            uint256 updatedAt
        )
    {
        User storage u = users[user];
        return (u.name, u.apis, u.cids, u.updatedAt);
    }

    function getUserCount() external view returns (uint256) {
        return userList.length;
    }

    function getUsers(
        uint256 start,
        uint256 count
    )
        external
        view
        returns (
            address[] memory addresses,
            string[] memory names,
            uint256[] memory timestamps
        )
    {
        require(start <= userList.length, "Invalid start");

        uint256 end = start + count;
        if (end > userList.length) {
            end = userList.length;
        }

        uint256 length = end - start;
        addresses = new address[](length);
        names = new string[](length);
        timestamps = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            address addr = userList[start + i];
            User storage user = users[addr];
            addresses[i] = addr;
            names[i] = user.name;
            timestamps[i] = user.updatedAt;
        }
    }

    function getAllUsers()
        external
        view
        returns (
            address[] memory addresses,
            string[] memory names,
            uint256[] memory timestamps
        )
    {
        uint256 length = userList.length;
        addresses = new address[](length);
        names = new string[](length);
        timestamps = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            address addr = userList[i];
            User storage user = users[addr];
            addresses[i] = addr;
            names[i] = user.name;
            timestamps[i] = user.updatedAt;
        }
    }
}
