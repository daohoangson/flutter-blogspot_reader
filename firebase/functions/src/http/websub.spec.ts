import { generatePayloadFromHubTopic } from './websub';
import { expect } from 'chai';

// tslint:disable-next-line
import 'mocha';

describe('generatePayloadFromHubTopic', () => {

  it('should return payload with notification', async () => {
    const hubTopic = 'https://google.blogspot.com/feeds/posts/default';
    const result = await generatePayloadFromHubTopic(hubTopic);
    expect(result).to.deep.equal({
      notification: {
        title: 'Google on BlogSpot',
        body: 'Latest item: Google to Acquire Blogger',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      data: { hubTopic }
    });
  });

});
