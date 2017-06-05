'use strict'
let path = require('path');

module.exports = {
    entry: {
        mvvm: './js/test/a.js'
    },
    output: {
        path: path.resolve('./dist'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                test: /\.js$/, 
                loader: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    }
};