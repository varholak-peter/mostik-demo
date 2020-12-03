
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
(function () {
    'use strict';

    function noop() {}

    function add_location(element, file, line, column, char) {
    	element.__svelte_meta = {
    		loc: { file, line, column, char }
    	};
    }

    function run(fn) {
    	return fn();
    }

    function blank_object() {
    	return Object.create(null);
    }

    function run_all(fns) {
    	fns.forEach(run);
    }

    function is_function(thing) {
    	return typeof thing === 'function';
    }

    function safe_not_equal(a, b) {
    	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
    	target.appendChild(node);
    }

    function insert(target, node, anchor) {
    	target.insertBefore(node, anchor || null);
    }

    function detach(node) {
    	node.parentNode.removeChild(node);
    }

    function element(name) {
    	return document.createElement(name);
    }

    function text(data) {
    	return document.createTextNode(data);
    }

    function space() {
    	return text(' ');
    }

    function listen(node, event, handler, options) {
    	node.addEventListener(event, handler, options);
    	return () => node.removeEventListener(event, handler, options);
    }

    function children(element) {
    	return Array.from(element.childNodes);
    }

    function set_data(text, data) {
    	data = '' + data;
    	if (text.data !== data) text.data = data;
    }

    let current_component;

    function set_current_component(component) {
    	current_component = component;
    }

    const dirty_components = [];

    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];

    function schedule_update() {
    	if (!update_scheduled) {
    		update_scheduled = true;
    		resolved_promise.then(flush);
    	}
    }

    function add_render_callback(fn) {
    	render_callbacks.push(fn);
    }

    function flush() {
    	const seen_callbacks = new Set();

    	do {
    		// first, call beforeUpdate functions
    		// and update components
    		while (dirty_components.length) {
    			const component = dirty_components.shift();
    			set_current_component(component);
    			update(component.$$);
    		}

    		while (binding_callbacks.length) binding_callbacks.shift()();

    		// then, once components are updated, call
    		// afterUpdate functions. This may cause
    		// subsequent updates...
    		while (render_callbacks.length) {
    			const callback = render_callbacks.pop();
    			if (!seen_callbacks.has(callback)) {
    				callback();

    				// ...so guard against infinite loops
    				seen_callbacks.add(callback);
    			}
    		}
    	} while (dirty_components.length);

    	while (flush_callbacks.length) {
    		flush_callbacks.pop()();
    	}

    	update_scheduled = false;
    }

    function update($$) {
    	if ($$.fragment) {
    		$$.update($$.dirty);
    		run_all($$.before_render);
    		$$.fragment.p($$.dirty, $$.ctx);
    		$$.dirty = null;

    		$$.after_render.forEach(add_render_callback);
    	}
    }

    function mount_component(component, target, anchor) {
    	const { fragment, on_mount, on_destroy, after_render } = component.$$;

    	fragment.m(target, anchor);

    	// onMount happens after the initial afterUpdate. Because
    	// afterUpdate callbacks happen in reverse order (inner first)
    	// we schedule onMount callbacks before afterUpdate callbacks
    	add_render_callback(() => {
    		const new_on_destroy = on_mount.map(run).filter(is_function);
    		if (on_destroy) {
    			on_destroy.push(...new_on_destroy);
    		} else {
    			// Edge case - component was destroyed immediately,
    			// most likely as a result of a binding initialising
    			run_all(new_on_destroy);
    		}
    		component.$$.on_mount = [];
    	});

    	after_render.forEach(add_render_callback);
    }

    function destroy(component, detaching) {
    	if (component.$$) {
    		run_all(component.$$.on_destroy);
    		component.$$.fragment.d(detaching);

    		// TODO null out other refs, including component.$$ (but need to
    		// preserve final state?)
    		component.$$.on_destroy = component.$$.fragment = null;
    		component.$$.ctx = {};
    	}
    }

    function make_dirty(component, key) {
    	if (!component.$$.dirty) {
    		dirty_components.push(component);
    		schedule_update();
    		component.$$.dirty = blank_object();
    	}
    	component.$$.dirty[key] = true;
    }

    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
    	const parent_component = current_component;
    	set_current_component(component);

    	const props = options.props || {};

    	const $$ = component.$$ = {
    		fragment: null,
    		ctx: null,

    		// state
    		props: prop_names,
    		update: noop,
    		not_equal: not_equal$$1,
    		bound: blank_object(),

    		// lifecycle
    		on_mount: [],
    		on_destroy: [],
    		before_render: [],
    		after_render: [],
    		context: new Map(parent_component ? parent_component.$$.context : []),

    		// everything else
    		callbacks: blank_object(),
    		dirty: null
    	};

    	let ready = false;

    	$$.ctx = instance
    		? instance(component, props, (key, value) => {
    			if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
    				if ($$.bound[key]) $$.bound[key](value);
    				if (ready) make_dirty(component, key);
    			}
    		})
    		: props;

    	$$.update();
    	ready = true;
    	run_all($$.before_render);
    	$$.fragment = create_fragment($$.ctx);

    	if (options.target) {
    		if (options.hydrate) {
    			$$.fragment.l(children(options.target));
    		} else {
    			$$.fragment.c();
    		}

    		if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
    		mount_component(component, options.target, options.anchor);
    		flush();
    	}

    	set_current_component(parent_component);
    }

    class SvelteComponent {
    	$destroy() {
    		destroy(this, true);
    		this.$destroy = noop;
    	}

    	$on(type, callback) {
    		const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
    		callbacks.push(callback);

    		return () => {
    			const index = callbacks.indexOf(callback);
    			if (index !== -1) callbacks.splice(index, 1);
    		};
    	}

    	$set() {
    		// overridden by instance, if it has props
    	}
    }

    class SvelteComponentDev extends SvelteComponent {
    	constructor(options) {
    		if (!options || (!options.target && !options.$$inline)) {
    			throw new Error(`'target' is a required option`);
    		}

    		super();
    	}

    	$destroy() {
    		super.$destroy();
    		this.$destroy = () => {
    			console.warn(`Component was already destroyed`); // eslint-disable-line no-console
    		};
    	}
    }

    /* src/components/HelloWorld.svelte generated by Svelte v3.4.0 */

    const file = "src/components/HelloWorld.svelte";

    function create_fragment(ctx) {
    	var div1, div0, p0, t0, t1, t2, p1, t3, t4_value = JSON.stringify(ctx.data, null, 2), t4, t5, br, t6, button0, t8, button1, dispose;

    	return {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text("Registration status: ");
    			t1 = text(ctx.registrationStatus);
    			t2 = space();
    			p1 = element("p");
    			t3 = text("Data: ");
    			t4 = text(t4_value);
    			t5 = space();
    			br = element("br");
    			t6 = space();
    			button0 = element("button");
    			button0.textContent = "Register";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Get Data";
    			add_location(p0, file, 36, 2, 909);
    			add_location(p1, file, 37, 2, 960);
    			add_location(br, file, 38, 2, 1007);
    			button0.className = "button w-40 svelte-o5s95t";
    			add_location(button0, file, 39, 2, 1015);
    			button1.className = "button w-40 svelte-o5s95t";
    			add_location(button1, file, 40, 2, 1085);
    			div0.className = "flex flex-col items-center justify-around h-56";
    			add_location(div0, file, 34, 2, 845);
    			div1.className = "flex flex-col items-center justify-center h-screen bg-gray-200";
    			add_location(div1, file, 33, 0, 766);

    			dispose = [
    				listen(button0, "click", ctx.registerCb),
    				listen(button1, "click", ctx.getDataCb)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, p0);
    			append(p0, t0);
    			append(p0, t1);
    			append(div0, t2);
    			append(div0, p1);
    			append(p1, t3);
    			append(p1, t4);
    			append(div0, t5);
    			append(div0, br);
    			append(div0, t6);
    			append(div0, button0);
    			append(div0, t8);
    			append(div0, button1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.registrationStatus) {
    				set_data(t1, ctx.registrationStatus);
    			}

    			if ((changed.data) && t4_value !== (t4_value = JSON.stringify(ctx.data, null, 2))) {
    				set_data(t4, t4_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div1);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let registrationStatus = 'initial';
      let data = null;

      async function registerCb () {
        $$invalidate('registrationStatus', registrationStatus = 'pending');

        try {
          const res = await fetch('http://localhost:16557/register', {method: 'POST'});

          if (res.ok) {
            $$invalidate('registrationStatus', registrationStatus = 'registered');
          }
        } catch (err) {
          $$invalidate('registrationStatus', registrationStatus = 'failed');
        }
      }

      async function getDataCb () {
        $$invalidate('data', data = 'Loading data...');

        try {
          const res = await fetch('http://localhost:16557');
          const resData = await res.json();
          $$invalidate('data', data = resData);
        } catch (err) {
          $$invalidate('data', data = 'Error fetching data');
        }
      }

    	return {
    		registrationStatus,
    		data,
    		registerCb,
    		getDataCb
    	};
    }

    class HelloWorld extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    /* src/components/Router.svelte generated by Svelte v3.4.0 */

    function create_fragment$1(ctx) {
    	return {
    		c: noop,

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    function instance$1($$self) {
    	/**Renderless component to act as a simple router using the History API
       *On browser load, parse the url and extract parameters
       */
      window.onload = function() {
        if (window.location.search.length > 0) {
          const params = window.location.search.substr(1);
          params.split("&").forEach(param => {
            const key = param.split("=")[0];
            const value = parseFloat(param.split("=")[1]);
            console.log(`Parameter of ${key} is ${value}`);
          });
        }
      };

      /**
       * Handle broswer back events here
       */
      window.onpopstate = function(event) {
        if (event.state) ;
      };

    	return {};
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    /* src/App.svelte generated by Svelte v3.4.0 */

    const file$1 = "src/App.svelte";

    function create_fragment$2(ctx) {
    	var main, t, current;

    	var router = new Router({ $$inline: true });

    	var helloworld = new HelloWorld({ $$inline: true });

    	return {
    		c: function create() {
    			main = element("main");
    			router.$$.fragment.c();
    			t = space();
    			helloworld.$$.fragment.c();
    			main.className = "overflow-hidden";
    			add_location(main, file$1, 11, 0, 269);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, main, anchor);
    			mount_component(router, main, null);
    			append(main, t);
    			mount_component(helloworld, main, null);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			router.$$.fragment.i(local);

    			helloworld.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			router.$$.fragment.o(local);
    			helloworld.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(main);
    			}

    			router.$destroy();

    			helloworld.$destroy();
    		}
    	};
    }

    function instance$2($$self) {
    	

      if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/service-worker.js');
        }

    	return {};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    	}
    }

    const app = new App({
      target: document.body
    });

}());
//# sourceMappingURL=main.js.map
