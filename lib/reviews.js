'use strict';

const R = require('ramda');
const common = require('./common');
const parseString = require('xml2js').parseString;
const app = require('./app');
const c = require('./constants');

function parseXML (string) {
  console.log('parsing xml', string);
  return new Promise(function (resolve, reject) {
    return parseString(string, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('parsed json', res);
      resolve(res);
    });
  });
}

function ensureArray (value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

function cleanList (results) {
  const reviews = ensureArray(results.feed.entry);
  return reviews.map((review) => {
    console.log('individual review:', review);
    return {
      id: review.id[0],
      userName: review.author[0].name[0],
      userUrl: review.author[0].uri[0],
      version: review['im:version'][0],
      score: parseInt(review['im:rating'][0]),
      title: review.title[0],
      text: review.content[0]._,
      updated: review.updated[0],
      url: review.link[0].$.href
    }
  });
}

const reviews = (opts) => new Promise((resolve) => {
  validate(opts);

  if (opts.id) {
    resolve(opts.id);
  } else if (opts.appId) {
    resolve(app(opts).then(app => app.id));
  }
})
  .then((id) => {
    opts = opts || {};
    opts.sort = opts.sort || c.sort.RECENT;
    opts.page = opts.page || 1;
    opts.country = opts.country || 'us';

    const url = `https://itunes.apple.com/${opts.country}/rss/customerreviews/page=${opts.page}/id=${id}/sortby=${opts.sort}/xml`;
    return common.request(url, {}, opts.requestOptions);
  })
  .then(parseXML)
  //.then(JSON.parse)
  .then(cleanList);

function validate (opts) {
  if (!opts.id && !opts.appId) {
    throw Error('Either id or appId is required');
  }

  if (opts.sort && !R.contains(opts.sort, R.values(c.sort))) {
    throw new Error('Invalid sort ' + opts.sort);
  }

  if (opts.page && opts.page < 1) {
    throw new Error('Page cannot be lower than 1');
  }

  if (opts.page && opts.page > 10) {
    throw new Error('Page cannot be greater than 10');
  }
}

module.exports = reviews;
