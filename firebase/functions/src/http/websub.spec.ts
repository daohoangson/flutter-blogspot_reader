import { generateTopicMessage } from './websub';
import { expect } from 'chai';

// tslint:disable-next-line
import 'mocha';

describe('generateTopicMessage', () => {

  it('should return message with topic, notification, data.hubTopic', async () => {
    const hubTopic = 'https://google.blogspot.com/feeds/posts/default';
    const result = await generateTopicMessage(hubTopic);

    expect(result.notification).to.deep.equal({
      title: 'Google on BlogSpot',
      body: 'Google to Acquire Blogger',
    });

    expect(result.data).to.deep.equal({ hubTopic });
  });

  it('should return message with Android imageUrl', async () => {
    const hubTopic = 'https://passion.cuongdc.co/feeds/posts/default';
    const result = await generateTopicMessage(hubTopic);

    expect(result.android && result.android.notification ? result.android.notification.imageUrl : undefined).to.be.string;
  });

});
