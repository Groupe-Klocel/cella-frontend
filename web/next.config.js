/** @type {import('next').NextConfig} */
const withAntdLess = require('next-plugin-antd-less');
const nextTranslate = require('next-translate');

module.exports = withAntdLess(
    nextTranslate({
        reactStrictMode: true
    })
);
