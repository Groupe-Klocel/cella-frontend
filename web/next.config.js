/** @type {import('next').NextConfig} */
import withAntdLess from 'next-plugin-antd-less';
import nextTranslate from 'next-translate-plugin';

const config = withAntdLess(
    nextTranslate({
        reactStrictMode: false,
        transpilePackages: [
            'antd',
            '@ant-design/icons',
            '@ant-design/icons-svg',
            'rc-util',
            'rc-pagination',
            'rc-picker',
            'rc-tree',
            'rc-table',
            'lodash-es',
            '@ant-design/pro-form'
        ]
    })
);

export default config;
