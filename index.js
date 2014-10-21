var util = require('util');
var events = require('events');

function Cache(opts) {
  opts = opts || {};

  this._store = {};
  this._ttl = Number(opts.ttl);
}

util.inherits(Cache, events.EventEmitter);

Cache.prototype.put = function (key, val, ttl) {
  if (key === undefined || val === undefined) {
    return;
  }

  ttl = ttl === undefined ? this._ttl : Number(ttl);

  this.del(key);

  this._store[key] = {
    val: val,
    expire: now() + ttl,
    timeout: setTimeout(function() {
      this.del(key);
    }.bind(this), ttl)
  };

  this.emit('put', key, val, ttl);
};

Cache.prototype.get = function (key) {
  var rec = this._store[key];

  if (rec) {
    if (!(rec.expire && rec.expire > now())) {
      this.del(key);
      this.emit('miss', key);
      rec = undefined;
    } else {
      this.emit('hit', key, rec.val);
    }
  } else {
    this.emit('miss', key);
  }

  return rec && rec.val;
};

Cache.prototype.del = function (key) {
  if (this._store[key]) {
    var val = this._store[key].val;

    clearTimeout(this._store[key].timeout);
    delete this._store[key];
    this.emit('del', key, val);

    return val;
  }
};

Cache.prototype.clear = function () {
  Object.keys(this._store).forEach(function(key) {
    this.del(key);
  }.bind(this));
};

Cache.prototype.size = function () {
  return Object.keys(this._store).reduce(function(size, key) {
    return size + (this.get(key) !== undefined ? 1 : 0);
  }.bind(this), 0);
};

function now() {
  return Date.now();
}

module.exports = Cache;
