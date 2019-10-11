import { generateTopicMessage } from './websub';
import { expect } from 'chai';
import { get } from 'request-promise-native';

// tslint:disable-next-line
import 'mocha';

describe('generateTopicMessage', () => {

  it('should return message with topic, notification, data', async () => {
    const hubTopic = 'https://google.blogspot.com/feeds/posts/default';
    const xml = await get(hubTopic);
    const result = await generateTopicMessage(hubTopic, xml);

    const title = 'Google on BlogSpot';
    const body = 'Google to Acquire Blogger';
    expect(result.notification).to.deep.equal({ title, body });
    expect(result.data).to.deep.equal({ hubTopic, title });
  });

  it('should return message with Android imageUrl', async () => {
    const hubTopic = 'http://domain.com/feed.rss';
    const xml = '<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title type="text">Blog title</title><entry><title type="text">Entry title</title><content type="html">Entry content</content><media:thumbnail url="http://domain.com/image.jpg" /></entry></feed>';
    const result = await generateTopicMessage(hubTopic, xml);

    expect(result.android!.notification!.imageUrl).to.equal('http://domain.com/image.jpg');
  });

  describe('error handling', () => {
    const xmlFeedTitle = '<title type="text">Blog title</title>';
    const xmlEntryTitle = '<title type="text">Entry title</title>';
    const xmlEntry = `<entry>${xmlEntryTitle}<link rel="alternative" href="http://domain.com/entry"/></entry>`;
    const fullXml = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">${xmlFeedTitle}${xmlEntry}</feed>`;

    it('should handle missing feed title', async () => {
      const hubTopic = 'http://domain.com/feed.rss';
      const xml = fullXml.replace(xmlFeedTitle, '');
      const result = await generateTopicMessage(hubTopic, xml);

      expect(result.data!.debug).to.equal('!feed.title');
    })

    it('should handle missing item', async () => {
      const hubTopic = 'http://domain.com/feed.rss';
      const xml = fullXml.replace(xmlEntry, '');
      const result = await generateTopicMessage(hubTopic, xml);

      expect(result.data!.debug).to.equal('feed.items.length < 1');
    })

    it('should handle missing entry title', async () => {
      const hubTopic = 'http://domain.com/feed.rss';
      const xml = fullXml.replace(xmlEntryTitle, '');
      const result = await generateTopicMessage(hubTopic, xml);

      expect(result.data!.debug).to.equal('!item.title');
    })
  })

});
