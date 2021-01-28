/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Compiler = require("./Compiler");
const MultiCompiler = require("./MultiCompiler");
const NodeEnvironmentPlugin = require("./node/NodeEnvironmentPlugin");
const WebpackOptionsApply = require("./WebpackOptionsApply");
const WebpackOptionsDefaulter = require("./WebpackOptionsDefaulter");
const validateSchema = require("./validateSchema");
const WebpackOptionsValidationError = require("./WebpackOptionsValidationError");
const webpackOptionsSchema = require("../schemas/WebpackOptions.json");
const RemovedPluginError = require("./RemovedPluginError");
const version = require("../package.json").version;

/** @typedef {import("../declarations/WebpackOptions").WebpackOptions} WebpackOptions */

/**
 * 
 * @param {WebpackOptions} options options object
 * @param {function(Error=, Stats=): void=} callback callback
 * @returns {Compiler | MultiCompiler} the compiler object
 */
//! 1.导出的是一个用于创建 Compiler 的函数
const webpack = (options, callback) => {
	const webpackOptionsValidationErrors = validateSchema(
		webpackOptionsSchema,
		options
	);
	if (webpackOptionsValidationErrors.length) {
		throw new WebpackOptionsValidationError(webpackOptionsValidationErrors);
	}
	let compiler;
	//! 多路打包 
	if (Array.isArray(options)) {
		compiler = new MultiCompiler(
			Array.from(options).map(options => webpack(options))
		);
	} else if (typeof options === "object") {
		//! 2.单路打包
		options = new WebpackOptionsDefaulter().process(options);
		compiler = new Compiler(options.context);
		compiler.options = options;
		new NodeEnvironmentPlugin({
			infrastructureLogging: options.infrastructureLogging
		}).apply(compiler);
		//! 3.注册已配置的插件 
		if (options.plugins && Array.isArray(options.plugins)) {
			for (const plugin of options.plugins) {
				if (typeof plugin === "function") {
					plugin.call(compiler, compiler);
				} else {
					plugin.apply(compiler);
				}
			}
		}
		//! 4.触发特定的Hook
		compiler.hooks.environment.call();
		compiler.hooks.afterEnvironment.call();
		//* 创建内置插件
		compiler.options = new WebpackOptionsApply().process(options, compiler);
	} else {
		throw new Error("Invalid argument: options");
	}
	if (callback) {
		if (typeof callback !== "function") {
			throw new Error("Invalid argument: callback");
		}
		if (
			options.watch === true ||
			(Array.isArray(options) && options.some(o => o.watch))
		) {
			const watchOptions = Array.isArray(options)
				? options.map(o => o.watchOptions || {})
				: options.watchOptions || {};
			return compiler.watch(watchOptions, callback);
		}
		compiler.run(callback);
	}
	return compiler;
};

exports = module.exports = webpack;
exports.version = version;
// ...
const exportPlugins = (obj, mappings) => {
	for (const name of Object.keys(mappings)) {
		Object.defineProperty(obj, name, {
			configurable: false,
			enumerable: true,
			get: mappings[name]
		});
	}
};
//! 5.我们默认使用的就是单一入口打包的方式，所以这里最终会执行其中的 SingleEntryPlugin
exportPlugins(exports, {
	// ...
	SingleEntryPlugin: () => require("./SingleEntryPlugin"),
	SourceMapDevToolPlugin: () => require("./SourceMapDevToolPlugin"),
	Stats: () => require("./Stats"),
	Template: () => require("./Template"),
	UmdMainTemplatePlugin: () => require("./UmdMainTemplatePlugin"),
	WatchIgnorePlugin: () => require("./WatchIgnorePlugin")
});

exportPlugins((exports.dependencies = {}), {
	DependencyReference: () => require("./dependencies/DependencyReference")
});
exportPlugins((exports.optimize = {}), {
	AggressiveMergingPlugin: () => require("./optimize/AggressiveMergingPlugin"),
	AggressiveSplittingPlugin: () =>
		require("./optimize/AggressiveSplittingPlugin"),
	ChunkModuleIdRangePlugin: () =>
		require("./optimize/ChunkModuleIdRangePlugin"),
	LimitChunkCountPlugin: () => require("./optimize/LimitChunkCountPlugin"),
	MinChunkSizePlugin: () => require("./optimize/MinChunkSizePlugin"),
	ModuleConcatenationPlugin: () =>
		require("./optimize/ModuleConcatenationPlugin"),
	OccurrenceOrderPlugin: () => require("./optimize/OccurrenceOrderPlugin"),
	OccurrenceModuleOrderPlugin: () =>
		require("./optimize/OccurrenceModuleOrderPlugin"),
	OccurrenceChunkOrderPlugin: () =>
		require("./optimize/OccurrenceChunkOrderPlugin"),
	RuntimeChunkPlugin: () => require("./optimize/RuntimeChunkPlugin"),
	SideEffectsFlagPlugin: () => require("./optimize/SideEffectsFlagPlugin"),
	SplitChunksPlugin: () => require("./optimize/SplitChunksPlugin")
});
exportPlugins((exports.web = {}), {
	FetchCompileWasmTemplatePlugin: () =>
		require("./web/FetchCompileWasmTemplatePlugin"),
	JsonpTemplatePlugin: () => require("./web/JsonpTemplatePlugin")
});
exportPlugins((exports.webworker = {}), {
	WebWorkerTemplatePlugin: () => require("./webworker/WebWorkerTemplatePlugin")
});
exportPlugins((exports.node = {}), {
	NodeTemplatePlugin: () => require("./node/NodeTemplatePlugin"),
	ReadFileCompileWasmTemplatePlugin: () =>
		require("./node/ReadFileCompileWasmTemplatePlugin")
});
exportPlugins((exports.debug = {}), {
	ProfilingPlugin: () => require("./debug/ProfilingPlugin")
});
exportPlugins((exports.util = {}), {
	createHash: () => require("./util/createHash")
});

const defineMissingPluginError = (namespace, pluginName, errorMessage) => {
	Object.defineProperty(namespace, pluginName, {
		configurable: false,
		enumerable: true,
		get() {
			throw new RemovedPluginError(errorMessage);
		}
	});
};

// TODO remove in webpack 5
defineMissingPluginError(
	exports.optimize,
	"UglifyJsPlugin",
	"webpack.optimize.UglifyJsPlugin has been removed, please use config.optimization.minimize instead."
);

// TODO remove in webpack 5
defineMissingPluginError(
	exports.optimize,
	"CommonsChunkPlugin",
	"webpack.optimize.CommonsChunkPlugin has been removed, please use config.optimization.splitChunks instead."
);
