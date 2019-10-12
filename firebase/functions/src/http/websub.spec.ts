import { generateTopicMessage } from './websub';
import { expect } from 'chai';
import { get } from 'request-promise-native';

// tslint:disable-next-line
import 'mocha';

describe('generateTopicMessage', () => {

  const xmlFeedTitle = '<title type="text">Blog title</title>';
  const xmlEntryDate = '<published>2019-01-01T00:00:00.000+07:00</published>';
  const xmlEntryLink = '<link rel="alternative" href="http://domain.com/entry"/>';
  const xmlEntryTitle = '<title type="text">Entry title</title>';
  const xmlEntry = `<entry>${xmlEntryDate}${xmlEntryLink}${xmlEntryTitle}</entry>`;
  const fullXml = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">${xmlFeedTitle}${xmlEntry}</feed>`;

  it('should return message with topic, notification, data', async () => {
    const hubTopic = 'https://google.blogspot.com/feeds/posts/default';
    const xml = await get(hubTopic);
    const result = await generateTopicMessage(hubTopic, xml);

    const title = 'Google on BlogSpot';
    const body = 'Google to Acquire Blogger';
    expect(result.notification).to.deep.equal({ title, body });
    expect(result.data).to.deep.equal({
      hubTopic,
      'item.date': '1301670360000',
      'item.link': 'https://google.blogspot.com/2011/04/google-to-acquire-blogger.html',
      'site.title': title
    });
  });

  it('should return message with Android imageUrl', async () => {
    const imageUrl = 'http://domain.com/image.jpg';
    const xmlEntryThumbnail = `<media:thumbnail url="${imageUrl}" />`;
    const xml = fullXml.replace('</entry>', xmlEntryThumbnail + '</entry>');
    const result = await generateTopicMessage('', xml);
    expect(result.android!.notification!.imageUrl).to.equal(imageUrl);
  });

  describe('error handling', () => {
    it('should handle missing feed title', async () => {
      const xml = fullXml.replace(xmlFeedTitle, '');
      const result = await generateTopicMessage('', xml);

      expect(result.data!.debug).to.equal('!feed.title');
    })

    it('should handle missing item', async () => {
      const xml = fullXml.replace(xmlEntry, '');
      const result = await generateTopicMessage('', xml);

      expect(result.data!.debug).to.equal('feed.items.length < 1');
    })

    it('should handle missing entry date', async () => {
      const xml = fullXml.replace(xmlEntryDate, '');
      const result = await generateTopicMessage('', xml);

      expect(result.data!.debug).to.equal('!item.date');
    })

    it('should handle missing entry link', async () => {
      const xml = fullXml.replace(xmlEntryLink, '');
      const result = await generateTopicMessage('', xml);

      expect(result.data!.debug).to.equal('!item.link');
    })

    it('should handle missing entry title', async () => {
      const xml = fullXml.replace(xmlEntryTitle, '');
      const result = await generateTopicMessage('', xml);

      expect(result.data!.debug).to.equal('!item.title');
    })
  })

});
