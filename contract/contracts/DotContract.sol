// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DotRegistry {
    struct Dot {
        string name;
        string[] APIs;
        string[] CIDs;
        uint256 update;
    }

    mapping(address => Dot) public dots;
    address[] public dotList;
    mapping(address => bool) public exists;

    // 添加限制常量
    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant MAX_ARRAY_LENGTH = 50;
    uint256 public constant MAX_STRING_LENGTH = 100;

    event DotUpdated(address indexed dot, uint256 timestamp);

    function setDot(
        string calldata name,
        string[] calldata APIs,
        string[] calldata CIDs
    ) external {
        // 验证输入长度
        require(bytes(name).length <= MAX_NAME_LENGTH, "Name too long");
        require(APIs.length <= MAX_ARRAY_LENGTH, "Too many APIs");
        require(CIDs.length <= MAX_ARRAY_LENGTH, "Too many CIDs");

        // 验证数组元素长度
        for (uint i = 0; i < APIs.length; i++) {
            require(
                bytes(APIs[i]).length <= MAX_STRING_LENGTH,
                "API string too long"
            );
        }
        for (uint i = 0; i < CIDs.length; i++) {
            require(
                bytes(CIDs[i]).length <= MAX_STRING_LENGTH,
                "CID string too long"
            );
        }

        if (!exists[msg.sender]) {
            dotList.push(msg.sender);
            exists[msg.sender] = true;
        }

        dots[msg.sender] = Dot({
            name: name,
            APIs: APIs,
            CIDs: CIDs,
            update: block.timestamp
        });

        emit DotUpdated(msg.sender, block.timestamp);
    }

    function getDot(
        address dot
    )
        external
        view
        returns (
            string memory name,
            string[] memory APIs,
            string[] memory CIDs,
            uint256 update
        )
    {
        Dot storage u = dots[dot];
        return (u.name, u.APIs, u.CIDs, u.update);
    }

    function getDotCount() external view returns (uint256) {
        return dotList.length;
    }

    function getDots(
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
        require(start <= dotList.length, "Invalid start");

        uint256 end = start + count;
        if (end > dotList.length) {
            end = dotList.length;
        }

        uint256 length = end - start;
        addresses = new address[](length);
        names = new string[](length);
        timestamps = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            address addr = dotList[start + i];
            Dot storage dot = dots[addr];
            addresses[i] = addr;
            names[i] = dot.name;
            timestamps[i] = dot.update;
        }
    }

    function getAllDots()
        external
        view
        returns (
            address[] memory addresses,
            string[] memory names,
            uint256[] memory timestamps
        )
    {
        uint256 length = dotList.length;
        addresses = new address[](length);
        names = new string[](length);
        timestamps = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            address addr = dotList[i];
            Dot storage dot = dots[addr];
            addresses[i] = addr;
            names[i] = dot.name;
            timestamps[i] = dot.update;
        }
    }
}
