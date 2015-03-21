﻿(function (window) {

    var AtomEnumerator = function (a) {
        this.a = a;
        this.i = -1;
    };
    AtomEnumerator.prototype = {
        next: function () {
            this.i++;
            return this.i < this.a.length;
        },
        current: function () {
            return this.a[this.i];
        }
    };


    var AtomFilter = {
        truef: function () {
            return true;
        },
        falsef: function () {
            return false;
        },

        get: function (item, n) {
            if (!item)
                return;
            var i = n.indexOf('.');
            if (i == -1) {
                return item[n];
            }
            var l = n.substr(0, i);
            n = n.substr(i + 1);
            return AtomFilter.get(item[l], n);
        },

        compare: function (cmp, r) {
            switch (cmp) {
                case "==":
                    return function (l) {
                        return l == r;
                    }
                case "<=":
                    return function (l) {
                        return l <= r;
                    }
                case ">=":
                    return function (l) {
                        return l >= r;
                    }
                case "<":
                    return function (l) {
                        return l < r;
                    }
                case ">":
                    return function (l) {
                        return l > r;
                    }
                case "in":
                    return function (l) {
                        if (!l) return false;
                        var ae = new AtomEnumerator(r);
                        while (ae.next()) {
                            var item = ae.current();
                            if (item == l)
                                return true;
                        }
                        return false;
                    }

                case "contains":
                    return function (l) {
                        if (!l) return false;
                        return l.indexOf(r) !== -1;
                    };


                case "~":
                    return function (l) {
                        return r.test(l);
                    };

                // has a value in an array
                case "has":
                    return function (l) {
                        if (!l) return false;
                        var ae = new AtomEnumerator(l);
                        while (ae.next()) {
                            var item = ae.current();
                            if (item == r)
                                return true;
                        }
                        return false;
                    }
                case "any":
                    return function (l) {
                        if (!l) return false;
                        var ae = new AtomEnumerator(l);
                        var rf = AtomFilter.filter(r);
                        while (ae.next()) {
                            var item = ae.current();
                            if (rf(item))
                                return true;
                        }
                        return false;
                    }
                case "all":
                    return function (l) {
                        if (!l) return false;
                        var ae = new AtomEnumerator(l);
                        var rf = AtomFilter.filter(r);
                        while (ae.next()) {
                            if (!rf(item))
                                return false;
                        }
                        return true;
                    }
                default:
                    return function (l) {
                        return false;
                    };
            }
        },

        filter: function (q, cor) {
            // compiles json object into function
            // that accepts object and returns true/false

            if (q === true)
                return AtomFilter.truef;
            if (q === false || q === null || q === undefined)
                return AtomFilter.falsef;

            var ae = [];

            for (var i in q) {
                if (!q.hasOwnProperty(i))
                    continue;
                var v = q[i];
                if (/\$or/i.test(i)) {
                    ae.push(function (item) {
                        return AtomFilter.filter(v, true)(item);
                    });
                    continue;
                }
                if (/\$not/i.test(i)) {
                    ae.push(function (item) {
                        return !AtomFilter.filter(v, cor)(item);
                    });
                    continue;
                }
                var args = i.split(' ');
                if (args.length === 1) {
                    args = i.split(':');
                }

                var n = args[0];
                var cond = "==";
                if (args.length === 2) {
                    cond = args[1];
                }

                var left = function (item) {
                    return AtomFilter.get(item, n);
                };
                var filter = null;
                if (cond.indexOf('!') !== 0) {
                    var compF = AtomFilter.compare(cond, v);
                    filter = function (item) {
                        var l = left(item);
                        return compF(l);
                    };

                } else {
                    cond = cond.substr(1);
                    var compF = AtomFilter.compare(cond, v);
                    filter = function (item) {
                        var l = left(item);
                        return !compF(l);
                    };
                }
                ae.push(filter);

            }

            return function (item) {

                var e = new AtomEnumerator(ae);
                while (e.next()) {
                    var ec = e.current();
                    if (ec(item)) {
                        if (cor) {
                            return true;
                        }
                    } else {
                        if (!cor)
                            return false;
                    }
                }
                return true;
            };

        }

    };

    window.$f = AtomFilter.filter;

})(window);