const path = require('path');
const HtmlwebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const merge = require('webpack-merge');
const Clean = require('clean-webpack-plugin');

const TARGET = process.env.npm_lifecycle_event;

const PATHS = {
    app: path.join(__dirname, 'app'),
    build: path.join(__dirname, 'build'),
};

const common = {
    entry: PATHS.app,
    resolve: {
        extensions: ['', '.js', '.jsx'],
        fallback: path.join(__dirname, 'node_modules'),
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                loaders: ['babel'],
                include: PATHS.app,
            },
        ],
    },
    plugins: [
        new HtmlwebpackPlugin({
            title: 'Redux-ORM Primer',
            inject: 'body',
            template: 'index.html',
        }),
    ],
};

if (TARGET === 'start' || !TARGET) {
    module.exports = merge(common, {
        plugins: [
            new webpack.HotModuleReplacementPlugin(),
        ],
        devServer: {
            historyApiFallback: true,
            inline: true,
            progress: true,

            // display only errors to reduce the amount of output
            stats: 'errors-only',

            // parse host and port from env so this is easy
            // to customize
            host: process.env.HOST,
            port: process.env.PORT,
        },
    });
}

if (TARGET === 'build') {
    module.exports = merge(common, {
        output: {
            path: PATHS.build,
            filename: 'bundle.js',
        },
        devtool: 'source-map',
        plugins: [
            new Clean([PATHS.build]),
            new webpack.optimize.UglifyJsPlugin({
                compress: {
                    warnings: false,
                },
            }),
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify('production'),
            }),
        ],
    });
}
