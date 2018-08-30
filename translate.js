(function(win){

/**
 * [Translate 翻译插件,需语言包]
 * @DateTime 2018-04-30
 * @param    {[Object]}   options  []
 */
function Translate(options){
	if(this instanceof Translate){
		return this.init.apply(this, arguments)
	}else{
		return new Translate(options)
	}
}

Translate.prototype = {
	init: function(options){
		this.options    = {
			openTag: window.template ? '[[' : '{{',
			closeTag: window.template ? ']]' : '}}',
			url: '/build/js/lang/lang_%lang%.js',
			wapper:      document, //翻译的容器
			langConfig:  window.langConfig || null, //语言包配置
			lang: window.lang || 'CN', //当前语言
			debug: 0, //开启调试
			comReg: null, //匹配正则
			escapeHTML: !true,
		};

		this.extend(this.options, options);
		this._initComReg();

		if(this.options.url){

			this.loadScript(this.parseUrl(this.options.url), function(){
				this.options.langConfig = window.langConfig;
				if(this.options.wapper === document){
					this.compilerTitle()
				}
				this.translate();
			});
		}else{
			if(this.options.wapper === document){
				this.compilerTitle()
			}
			this.translate();
		}
	},
	isDev: function(){
		return location.host.indexOf('localhost') > -1 || location.host.indexOf('127.0.0.1') > -1;
	},
	_initComReg: function(){
		var _left  = this.options.openTag;
		var _right = this.options.closeTag;
		var reg    = /[\[\]\{\}\>\<\^\#]/g;

		_left = _left.replace(reg, function(a){
			return '\\' + a;
		})

		_right = _right.replace(reg, function(a){
			return '\\' + a;
		})

		this.comReg = new RegExp(_left + "([^"+ _right +"]+)" + _right, 'gm');
	},

	extend: function(source, target){
		for(var attr in target){
			source[attr] = target[attr];
		}
		return source
	},

	translate: function(context){
		context = context || this.options.wapper;

		this.each(context.childNodes, function(index, instance){
			instance.compiler(this)
			instance.translate(this);
		});
	},
	trim: function(str){
		str = String(str);
		if(str.trim){
			return str.trim()
		}else{
			return str.replace(/^\s+|\s+$/g,'')
		}
	},
	isObject: function(arg){
		return Object.prototype.toString.call(arg) === '[object Object]';
	},
	//获得翻译后的结果
	getTranslationResult: function(text){
		var langConfig = this.options.langConfig;
		var lang       = this.options.lang;

		if(!text || !langConfig)return text;

		if(this.isObject(langConfig[text])){
			return langConfig[text][lang] !== undefined ? langConfig[text][lang] : '';
		}else if(langConfig[text]){
			return langConfig[text];
		}else{
			return this.getLikeQueryResult(text);
		}
	},
	//模糊查询后的结果
	getLikeQueryResult: function(text){
		var langConfig = this.options.langConfig;
		var lang       = this.options.lang;

		if(!text || !langConfig)return text;

		for(var attr in langConfig){
			var row = langConfig[attr];
			if(this.isObject(row)){
				for(var sub in row){
					if(row[sub] == text){
						return row[lang] !== undefined ? row[lang] : text;
					}
				}
			}else{
				return langConfig[text] !== undefined ? langConfig[text] : text;
			}
		}

		if(this.options.debug){
			throw new Error('` ' + text + ' `未查找到!')
		}
		return text;
	},
	parseUrl: function(url){
		var options = this.options;
		url = url.replace(/%(\w+)%/g,function(a,b){
			return options[b] || window[b] || b; 
		});
		if(this.isDev()){
			return url.replace(/build\//,'');
		}
		return url;
	},
	loadScript: function(url, callback, error){
		var self      = this;
		var oScript   = document.createElement ("script");
    var support   = 'onload' in oScript;
    var eventType = support ? 'onload' : 'onreadystatechange';

    oScript[eventType] = function(){
			if(support){
				callback.call(self);
			}else if(/complete|loaded/.test(oScript.readyState)){
				callback.call(self);
			}
    };
    oScript.onerror = function(){
			error && error.call(self);
    };
    oScript.type = "text/javascript";
    oScript.src  = url;
  	document.getElementsByTagName("head")[0].appendChild(oScript);
	},
	//获得翻译结果,传入文本返回翻译后的文本
	getTranslationText: function(text){
		text = this.trim(text);
		if(!text)return text;
		var self = this;
		text = text.replace(this.comReg, function(m, name){
			return self.getTranslationResult(name);
		});
		return text;
	},
	compilerTitle: function(){
		var title = this.trim(document.title);
		if(title){
			if(title.indexOf('{{') === -1){
				document.title = this.getTranslationResult(title)
			}else{
				document.title = this.getTranslationText(title)
			}
		}
	},
	compiler: function(node){
		if(!node){
			return;
		}
		if(node.nodeType === 3){
			node.nodeValue = this.getTranslationText(node.nodeValue);
		}else if(node.nodeType === 1){
			this.compilerAttribute(node)
		}
	},
	compilerAttribute: function(node){
		var attrs = this.dataTranslate(node);
		if(attrs === null)return
		if(attrs){
			var self = this;
			this.each(attrs.split('|'), function(){
				var exp = this.split('.');
				_setAttr(exp[0], exp[1]);
			})
			function _setAttr(attr, exp){
				var text  = node[attr] || node.getAttribute(attr);
				if(exp){
					var value = self.getTranslationResult(exp);
					node[attr] = value;
					//console.log(attr, exp)
					node.setAttribute(attr, value);
				}else{
					setText.call(self, attr);
				}
			}
		}else{
			var text = this.trim(node.innerText || node.textContent);
			setText.call(this, text);
		}
		function setText(text){
			if(!this.isInput(node)){
				var res = this.getTranslationResult(text)
				if(this.options.escapeHTML){
					node.innerText = node.textContent = res;
				}else{
					node.innerHTML = res;
				}
			}
		}
	},
	isInput: function(node){
		var nodeName = node.nodeName.toUpperCase();
		return nodeName === 'INPUT';
	},
	dataTranslate: function(node){
		return node ? node.getAttribute('data-translate') : false;
	},
	each: function(arr, callback){
		for(var i = 0, size = arr.length; i < size; i++){
			callback.call(arr[i], i, this);
		}
	}
};


win.translate = Translate;


}(window));

/*
var lang = 'CN';
var urlParams = location.search.match(/lang=([^&]+)/);
if(urlParams && urlParams[1]){
	lang = urlParams[1]
}
translate({
	lang:lang
});
*/
/********* example
<div>{{MSG}}</div>
<input type="text" value="hello" placeholder="world" data-translate="value.MSG|placeholder.HOME">
<p  data-translate>MSG</p>
<p  data-translate="MSG">消息</p>

translate({
		langConfig: {
			MSG: '你好,世界',
		},
		lang: 'CN'
});

<script type="text/template" id="tpl-amounts">
<span class="label">[[MSG]]</span>
</script>
*/