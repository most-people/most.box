// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract NameContract {
    // 从地址到名字的映射
    mapping(address => string) public names;

    // 从名字到地址的映射，允许重复
    mapping(string => address[]) public nameOwners;

    // 存储每个地址的字符串数据
    mapping(address => string) public Data;

    // 存储每个地址的 Dot
    mapping(address => string) public Dots;

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
     * @dev 将地址转换为小写十六进制字符串
     */
    function _toHexString(
        address account
    ) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(account);
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(40); // 20 bytes * 2
        for (uint i = 0; i < 20; i++) {
            str[i * 2] = alphabet[uint(uint8(data[i] >> 4))];
            str[i * 2 + 1] = alphabet[uint(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }

    /**
     * @dev 检查字符串是否以指定后缀结尾
     */
    function _endsWith(
        string memory _str,
        string memory _suffix
    ) internal pure returns (bool) {
        bytes memory strBytes = bytes(_str);
        bytes memory suffixBytes = bytes(_suffix);
        if (suffixBytes.length > strBytes.length) {
            return false;
        }
        for (uint i = 0; i < suffixBytes.length; i++) {
            if (
                strBytes[strBytes.length - suffixBytes.length + i] !=
                suffixBytes[i]
            ) {
                return false;
            }
        }
        return true;
    }

    /**
     * @dev 从名字列表中移除指定地址
     */
    function _removeAddressFromName(
        string memory _name,
        address _addr
    ) internal {
        string memory nameLower = _toLower(_name);
        address[] storage owners = nameOwners[nameLower];
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == _addr) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }
    }

    /**
     * @dev 设置或更新用户的名字。允许重复名字。
     * @param _newName 新的名字。
     */
    function setName(string calldata _newName) external {
        // 检查名字长度
        require(bytes(_newName).length >= 1, "Name too short");
        require(bytes(_newName).length <= 63, "Name too long");

        string memory newNameLower = _toLower(_newName);

        // 获取发送者的当前名字
        string memory oldName = names[msg.sender];

        // 如果用户已有名字，则从旧名字列表中移除
        if (bytes(oldName).length > 0) {
            _removeAddressFromName(oldName, msg.sender);
        }

        // 设置新的名字
        names[msg.sender] = _newName;
        nameOwners[newNameLower].push(msg.sender);
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
     * @dev 获取指定名字的所有者地址列表，支持模糊匹配过滤。
     * @param _name 要查询的名字。
     * @param _filter 过滤字符串（地址后缀），为空则返回所有。
     * @return 名字的所有者地址数组。
     */
    function getOwners(
        string calldata _name,
        string calldata _filter
    ) external view returns (address[] memory) {
        string memory nameLower = _toLower(_name);
        address[] memory owners = nameOwners[nameLower];

        if (bytes(_filter).length == 0) {
            return owners;
        }

        string memory filterLower = _toLower(_filter);
        uint count = 0;
        for (uint i = 0; i < owners.length; i++) {
            string memory addrHex = _toHexString(owners[i]);
            if (_endsWith(addrHex, filterLower)) {
                count++;
            }
        }

        address[] memory result = new address[](count);
        uint idx = 0;
        for (uint i = 0; i < owners.length; i++) {
            string memory addrHex = _toHexString(owners[i]);
            if (_endsWith(addrHex, filterLower)) {
                result[idx] = owners[i];
                idx++;
            }
        }

        return result;
    }

    /**
     * @dev 删除用户的名字。
     */
    function delName() external {
        // 获取发送者的当前名字
        string memory oldName = names[msg.sender];

        // 检查用户是否有名字
        require(bytes(oldName).length > 0, "Name not set");

        // 删除名字
        delete names[msg.sender];
        _removeAddressFromName(oldName, msg.sender);
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
        require(bytes(_data).length <= 1024, "Data too long");
        Data[msg.sender] = _data;
    }

    /**
     * @dev 删除调用者的 Data。
     */
    function delData() external {
        string memory old = Data[msg.sender];
        require(bytes(old).length > 0, "Data not set");
        delete Data[msg.sender];
    }

    /**
     * @dev 设置调用者自己的 Dot。
     * @param _dot 要设置的 Dot。
     */
    function setDot(string calldata _dot) external {
        require(bytes(_dot).length <= 140, "Dot too long");
        Dots[msg.sender] = _dot;
    }

    /**
     * @dev 获取指定地址的 Dot。
     * @param _address 要查询的地址。
     * @return 该地址的 Dot 字符串。
     */
    function getDot(address _address) external view returns (string memory) {
        return Dots[_address];
    }

    /**
     * @dev 删除调用者的 Dot。
     */
    function delDot() external {
        string memory old = Dots[msg.sender];
        require(bytes(old).length > 0, "Dot not set");
        delete Dots[msg.sender];
    }
}
