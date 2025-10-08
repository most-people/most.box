import fs from 'fs';
import custom from './custom.json' with { type: 'json' };
import defaultJson from './default.json' with { type: 'json' };

// 深度合并两个对象的函数
const deepMerge = (target, source) => {
    const result = { ...target };

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                // 如果是对象，递归合并
                result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
                // 如果是基本类型或数组，直接覆盖
                result[key] = source[key];
            }
        }
    }

    return result;
}

// 合并配置：custom 配置会覆盖 default 配置
const mergedConfig = deepMerge(defaultJson, custom);
fs.writeFileSync('./service.json', JSON.stringify(mergedConfig, null, 2));