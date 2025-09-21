// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract NameContract {
    // 从地址到名字的映射
    mapping(address => string) public names;
    // 从名字到地址的映射，用于检查唯一性
    mapping(string => address) public nameOwners;

    // 名字长度限制
    uint256 public constant MAX_NAME_LENGTH = 32;
    uint256 public constant MIN_NAME_LENGTH = 1;
    // Data 长度限制
    uint256 public constant MAX_DATA_LENGTH = 1024;

    // 存储每个地址的字符串数据
    mapping(address => string) public Data;

    /**
     * @dev 将字符串转换为小写
     */
    function _toLower(
        string memory _str
    ) internal pure returns (string memory) {
        bytes memory _bytes = bytes(_str);
        for (uint i = 0; i < _bytes.length; i++) {
            // A-Z in ASCII
            if (_bytes[i] >= 0x41 && _bytes[i] <= 0x5A) {
                _bytes[i] = bytes1(uint8(_bytes[i]) + 32);
            }
        }
        return string(_bytes);
    }

    /**
     * @dev 设置或更新用户的名字。
     * @param _newName 新的名字。
     */
    function setName(string calldata _newName) external {
        // 检查名字长度
        require(bytes(_newName).length >= MIN_NAME_LENGTH, "Name too short");
        require(bytes(_newName).length <= MAX_NAME_LENGTH, "Name too long");

        string memory newNameLower = _toLower(_newName);

        // 检查新名字是否已被其他用户占用
        address existingOwner = nameOwners[newNameLower];
        require(
            existingOwner == address(0) || existingOwner == msg.sender,
            "Name already taken"
        );

        // 获取发送者的当前名字
        string memory oldName = names[msg.sender];

        // 如果用户已有名字，则释放旧的名字
        if (bytes(oldName).length > 0) {
            delete nameOwners[_toLower(oldName)];
        }

        // 设置新的名字
        names[msg.sender] = _newName;
        nameOwners[newNameLower] = msg.sender;
    }

    /**
     * @dev 获取指定地址的名字。
     * @param _address 要查询的地址。
     * @return 用户的名字。
     */
    function getName(address _address) external view returns (string memory) {
        return names[_address];
    }

    /**
     * @dev 获取指定名字的所有者地址。
     * @param _name 要查询的名字。
     * @return 名字的所有者地址。
     */
    function getOwner(string calldata _name) external view returns (address) {
        return nameOwners[_toLower(_name)];
    }

    /**
     * @dev 删除用户的名字。
     */
    function deleteName() external {
        // 获取发送者的当前名字
        string memory oldName = names[msg.sender];

        // 检查用户是否有名字
        require(bytes(oldName).length > 0, "Name not set");

        // 删除名字
        delete names[msg.sender];
        delete nameOwners[_toLower(oldName)];
    }

    /**
     * @dev 获取指定地址的 Data。
     * @param _address 要查询的地址。
     * @return 该地址的 Data 字符串。
     */
    function getData(address _address) external view returns (string memory) {
        return Data[_address];
    }

    // 设置调用者自己的 Data
    function setData(string calldata _data) external {
        require(bytes(_data).length <= MAX_DATA_LENGTH, "Data too long");
        Data[msg.sender] = _data;
    }

    /**
     * @dev 删除调用者的 Data。
     */
    function deleteData() external {
        string memory old = Data[msg.sender];
        require(bytes(old).length > 0, "Data not set");
        delete Data[msg.sender];
    }
}
