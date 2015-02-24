var assert = require('assert');
var Cache = require('../');
var key = 'key';
var val = 'val';
var ttl = 10;

describe('cache', function () {
  it('should export a function', function () {
    assert.strictEqual(typeof Cache, 'function');
  });

  it('should honor capacity limit', function (done) {
    var cache = new Cache({
        capacity: 1
    });

    cache.on('drop', function (k, v, t) {
        assert.strictEqual(k, key);
        assert.strictEqual(v, val);
        assert.strictEqual(t, ttl);

        done();
    });

    cache.put(key + key, val, ttl);
    cache.put(key, val, ttl);
  });

  it('put should use default ttl', function (done) {
    var cache = new Cache({
      ttl: ttl
    });

    cache.on('put', function (k, v, t) {
      assert.strictEqual(k, key);
      assert.strictEqual(v, val);
      assert.strictEqual(t, ttl);

      assert.strictEqual(cache.get(key), val);
      assert.strictEqual(cache._store[key].timeout._idleTimeout, -1);

      done();
    });

    cache.put(key, val);
  });

  it('put should set key/value with ttl and emit put event', function (done) {
    var cache = new Cache();

    cache.on('put', function (k, v, t) {
      assert.strictEqual(k, key);
      assert.strictEqual(v, val);
      assert.strictEqual(t, ttl);

      assert.strictEqual(cache.get(key), val);
      assert.strictEqual(cache._store[key].timeout._idleTimeout, -1);

      done();
    });

    cache.put(key, val, ttl);
  });

  it('put should not set key/value for invalid inputs', function (done) {
    var cache = new Cache();

    cache.on('put', function () {
      assert.fail();
    });

    cache.put(undefined, val, ttl);
    cache.put(key, undefined, ttl);
    cache.put(undefined, undefined, ttl);

    setImmediate(done);
  });

  it('put should expire key/value after provided ttl', function (done) {
    var cache = new Cache();
    var delEmitted = false;

    cache.on('del', function (k, v) {
      assert.strictEqual(k, key);
      assert.strictEqual(v, val);

      delEmitted = true;
    });

    cache.put(key, val, ttl);

    setTimeout(function () {
      assert.strictEqual(delEmitted, true);
      assert.strictEqual(cache.get(key), undefined);

      done();
    }, ttl + 1);
  });

  it('get should emit hit/miss events', function (done) {
    var cache = new Cache();
    var hitEmitted = false;
    var missEmitted = false;

    cache.on('hit', function (k, v) {
      assert.strictEqual(k, key);
      assert.strictEqual(v, val);

      hitEmitted = true;
    });
    cache.on('miss', function (k) {
      assert.strictEqual(k, key + key);

      missEmitted = true;
    });

    cache.put(key, val, ttl);
    cache.get(key);
    cache.get(key + key);

    setImmediate(function () {
      assert.strictEqual(hitEmitted, true);
      assert.strictEqual(missEmitted, true);

      done();
    });
  });

  it('get should only return unexpired key/value', function () {
    var cache = new Cache();

    cache.put(key, val, ttl);
    cache._store[key].expire = Date.now() - 1;

    assert.strictEqual(cache.get(key), undefined);
  });

  it('del should remove key/value and clear timeout', function (done) {
    var cache = new Cache();
    var rec;

    cache.put(key, val, ttl);

    rec = cache._store[key];

    cache.on('del', function (k, v) {
      assert.strictEqual(k, key);
      assert.strictEqual(v, val);

      assert.strictEqual(cache.get(key), undefined);
      assert.strictEqual(rec.timeout._idleTimeout, -1);

      done();
    });

    assert.strictEqual(cache.del(key), val);
  });

  it('size should return number of valid key/value pairs when accurate is supplied', function () {
    var cache = new Cache();

    cache.put(key, val, ttl);
    cache.put(key + key, val, ttl);
    cache._store[key + key].expire = Date.now() - 1;

    assert.strictEqual(cache.size(true), 1);
  });

  it('clear should remove all key/value pairs', function () {
    var cache = new Cache();

    cache.put(key, val, ttl);
    cache.clear();

    assert.strictEqual(cache.size(), 0);
  });
});
