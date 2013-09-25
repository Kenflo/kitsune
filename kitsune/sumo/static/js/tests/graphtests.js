/*
 * Tests for k.graph.*.
 */

$(document).ready(function() {

    // Helper functions

    var G = k.graph;

    module('k.graph.get');

    test('basic usage', function() {
        var foo = {'bar': 5};
        equal(G.get('bar')(foo), 5);
    });

    test('missing key', function() {
        var foo = {'bar': 5};
        equal(G.get('qux')(foo), undefined);
    });

    test('it caches', function() {
        var a = G.get('foo');
        var b = G.get('foo');
        ok(a === b);
    });


    module('k.graph.ident');

    test('works for simple values', function() {
        equals(G.ident(5), 5);
    });

    test('works for objects', function() {
        var foo = {a: 1, b: 2};
        equals(G.ident(foo), foo);
    });


    module('k.graph.property');

    test('basic usage', function() {
        var foo = {
            bar: G.property()
        };
        equal(foo.bar(), undefined);
        foo.bar(5);
        equal(foo.bar(), 5);
    });

    test('set is chainable', function() {
        var foo = {
            bar: G.property(),
            baz: G.property(),
        };
        equal(foo.bar(1).baz(2), foo);
    });

    asyncTest('callback gets fired', function() {
        expect(1);  // assertions to be checked.
        var foo = {
            bar: G.property(undefined, function() {
                ok(true);
                start();
            })
        };
        foo.bar(5);
        stop();
    });

    asyncTest('callback calls after stack unwinds', function() {
        expect(2);
        var a = 0;
        var foo = {
            bar: G.property(undefined, function() {
                a++;
                ok(true);
                start();
            }),
        };
        foo.bar(1);
        equal(a, 0);
        stop();
    });


    module('k.graph.compose');

    test('basic usage', function() {
        function a(n) {
            return n + 1;
        }

        equal(G.compose(a, a)(0), 2);
    });

});
