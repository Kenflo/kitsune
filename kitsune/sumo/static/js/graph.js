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
        return function(d) {
            var res = d;
            funcs.forEach(function(func) {
                res = func(res);
            });
            return res;
        };
    }

    // Graph builders

    d3.chart('TimeSeries', {
        initialize: function() {
            var svg = this.base.append('svg');

            var lineBase = svg.append('g')
                .classed('timeseries-line', true);

            var scaleX = d3.scale.linear();
            var scaleY = d3.scale.linear();

            var line = d3.svg.line()
                .x(G.compose(G.get(0), scaleX))
                .y(G.compose(G.get(1), scaleY));

            this.layer('lines', lineBase, {
                dataBind: function(data) {
                    var chart = this.chart();
                    var minX = Infinity;
                    var maxX = -Infinity;
                    var minY = 0;
                    var maxY = -Infinity;

                    var speccedData = chart.specs().map(function(spec) {
                        return data.map(function(d) {
                            var x = spec.x(d);
                            var y = spec.y(d);
                            minX = Math.min(minX, x);
                            maxX = Math.max(minX, x);
                            minY = Math.min(minY, y);
                            maxY = Math.max(maxY, y);
                            return [x, y];
                        });
                    });

                    svg.attr('height', chart.height())
                        .attr('width', chart.width());
                    scaleX.range([0, chart.width()])
                        .domain([minX, maxX]);
                    scaleY.range([chart.height(), 0])
                        .domain([minY, maxY]);

                    return this.selectAll('path').data(speccedData);
                },
                insert: function() {
                    return this.append('path')
                        .attr('stroke', '#f00')
                        .attr('strokeWidth', 2)
                        .attr('fill', 'none');
                },
                events: {
                    'enter': function() {
                        return this.attr('d', line);
                    }
                }
            });
        },

        width: G.property(1000),
        height: G.property(400),
        specs: G.property([]),

    });

})();
