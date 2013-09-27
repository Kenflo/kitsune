
(function() {
    window.k = window.k || {};
    window.k.graph = window.k.graph || {};

    var G = window.k.graph;

    // Some helper functions

    /* Create a function that gets `key` from it's first argument.
     *
     * This will cache functions with the same key. In other words:
     *
     *     var a = get('foo');
     *     var b = get('foo');
     *     a === b;   // True
     */
    G.get = (function() {
        var cache = {};

        return function(key) {
            if (!(key in cache)) {
                cache[key] = function(d) {
                    return d[key];
                };
            }
            return cache[key];
        };
    })();

    /* A function that return's it's first argument. */
    G.ident = function(d) {
        return d;
    };

    /* Create a chainable, d3-style property.
     *
     * Use this like:
     *
     *   var foo = {
     *     bar: property(5),
     *   };
     *   foo.bar();  // returns 5
     *   foo.bar(6); // returns foo
     *   foo.bar();  // returns 6
     *
     * :arg def: Default, if no value is set.
     * :arg callback: Function to call when a new value is set.
     */
    G.property = function(def, callback) {
        var store = def;
        callback = callback || G.ident;

        return function(newVal) {
            if (arguments.length === 0) {
                return store;
            }
            setTimeout(callback.bind(this, newVal), 0);
            store = newVal;
            return this;
        };
    }; 

    /* Create a function that composes each argument passed as a parameter.
     *
     * `compose(a, b)(1)` is equivalent to `b(a(1))`.
     */
    G.compose = function(/* funcs */) {
        var funcs = Array.prototype.slice.call(arguments);
        return function(d, i) {
            var res = d;
            funcs.forEach(function(func) {
                res = func(res, i);
            });
            return res;
        };
    }

    /* Create a function that sums functors.
     *
     * `add(a, b)(1)` is equivalent to `a(1) + b(1)`.
     * `add(a, 2)(1)` is equivalent to `a(1) + 2`.
     */
    G.add = function(/* funcs */) {
        var functors = Array.prototype.map.call(arguments, d3.functor);
        return function(d, i) {
            var sum = 0;
            functors.forEach(function(f) {
                sum += f(d, i);
            });
            return sum;
        };
    }

    /* Create a function that multiplies functors.
     *
     * `multiply(a, b, c)(2)` is equivalent to `a(2) * b(2) * c(2)`.
     * `multiply(a, b, 2)(3)` is equivalent to `a(3) * b(3) * 2`.
     */
    G.multiply = function(/* funcs */) {
        var functors = Array.prototype.map.call(arguments, d3.functor);
        return function(d, i) {
            var product = 1;
            functors.forEach(function(f) {
                product *= f(d, i);
            });
            return product;
        };
    }

    /* Returns its second argument. 
     * 
     * Intended for use in places where d3 passes the current index as
     * the second argument.
     */
    G.index = function(d, i) {
        return i;
    }

    /* Returns its `this` context.
     *
     * Sometimes a useful thing is passed as `this`, which is unhelpful
     * for functional style. */
    G.popThis = function() {
        return this;
    }

    /* Makes a formatting function.
     *
     * The first argument is a format string, like "hello {0}". The rest
     * of the arguments are functors to fill the slots in the format
     * string.
     *
     * Example:
     *   function ident(n) { return n; }
     *   function double(n) { return n * 2; }
     *   var formatter = k.graph.format('{0} * 2 = {1}', ident, double);
     *   formatter(5);  // returns '5 * 2 = 10'
     */
    G.format = function(fmt /*, args */) {
        var args = Array.prototype.slice.call(arguments, 1).map(d3.functor);

        return function(d) {
            return fmt.replace(/\{[\d]+\}/g, function(key) {
                // Strip off {}
                key = key.slice(1, -1);
                var index = parseInt(key, 10);
                return args[index](d);
            });
        };
    }

})();
