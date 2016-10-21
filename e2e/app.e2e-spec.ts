import { ReditClonePage } from './app.po';

describe('redit-clone App', function() {
  let page: ReditClonePage;

  beforeEach(() => {
    page = new ReditClonePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
