import { Injectable } from '@angular/core';
import { Http, URLSearchParams } from '@angular/http';
import { Observable, BehaviorSubject } from 'rxjs';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';

import { Article } from './article';
import { environment } from '../environments/environment';

/**
 * [].sort(compare(a,b))
 * return value
 *  0 == they are equal in sort
 *  1 == a comes before b
 *  -1 == b comes before a
 */
interface ArticleSortFn {
  (a: Article, b: Article): number;
}

interface ArticleSortOrderFn {
  (direction: number): ArticleSortFn;
}

const sortByTime: ArticleSortOrderFn =
  (direction: number) => (a: Article, b: Article) => {
    return direction *
      (b.publishedAt.getTime() -
      a.publishedAt.getTime());
  };

const sortByVotes: ArticleSortOrderFn =
  (direction: number) => (a: Article, b: Article) => {
    return direction * (b.votes - a.votes);
  };

const sortFns = {
  'Time': sortByTime,
  'Votes': sortByVotes
};

@Injectable()
export class ArticleService {
  private _articles: BehaviorSubject<Article[]> =
    new BehaviorSubject<Article[]>([]);
  private _sources: BehaviorSubject<any> =
    new BehaviorSubject<any>([]);

  private _refreshSubject: BehaviorSubject<string> =
    new BehaviorSubject<string>('reddit-r-all');
  private _sortByDirectionSubject: BehaviorSubject<number> =
    new BehaviorSubject<number>(1);
  private _sortByFilterSubject: BehaviorSubject<ArticleSortOrderFn> =
    new BehaviorSubject<ArticleSortOrderFn>(sortByTime);
  private _filterBySubject: BehaviorSubject<string> =
    new BehaviorSubject<string>('');

  public sources: Observable<any> = this._sources.asObservable();
  public articles: Observable<Article[]> = this._articles.asObservable();
  public orderedArticles: Observable<Article[]>;

  constructor(
    private http: Http
  ) {
    this._refreshSubject
      .subscribe(this.getArticles.bind(this));

    this.orderedArticles =
      Observable.combineLatest(
        this._articles,
        this._sortByFilterSubject,
        this._sortByDirectionSubject,
        this._filterBySubject
      )
        .map(([
          articles, sorter, direction, filterStr
        ]) => {
          const re = new RegExp(filterStr, 'gi');
          return articles
            .filter(a => re.exec(a.title))
            .sort(sorter(direction));
        })
  }


  public sortBy(
    filter: string,
    direction: number
  ): void {
    this._sortByDirectionSubject.next(direction);
    this._sortByFilterSubject
      .next(sortFns[filter]);
  }

  public filterBy(filter: string) {
    this._filterBySubject.next(filter);
  }

  public updateArticles(sourceKey): void {
    this._refreshSubject.next(sourceKey);
  }

  public getArticles(sourceKey = 'reddit-r-all'): void {
    // make http request -> Observable
    // convert response into article class
    // update our subject
    this._makeHttpRequest('/v1/articles', sourceKey)
      .map(json => json.articles)
      .subscribe(articlesJSON => {
        const articles = articlesJSON
          .map(articlesjson => Article.fromJSON(articlesjson));
        this._articles.next(articles);
      });
  }

  public getSources(): void {
    this._makeHttpRequest('/v1/sources')
      .map(json => json.sources)
      .filter(list => list.length > 0)
      .subscribe(this._sources);
  }

  private _makeHttpRequest(
    path: string,
    sourceKey?: string
  ): Observable<any> {
    let params = new URLSearchParams();
    params.set('apiKey', environment.newsApiKey);
    if (sourceKey && sourceKey !== '') {
      params.set('source', sourceKey);
    }

    return this.http
      .get(`${environment.baseUrl}${path}`, {
        search: params
      }).map(resp => resp.json());
  }

  // public getArticles(): Promise<Article[]> {
  //   let params = new URLSearchParams();
  //   params.set('apiKey', environment.newsApiKey);
  //   params.set('source', 'reddit-r-all');
  //   return this.http
  //     .get(`${environment.baseUrl}/v1/articles`, {
  //       search: params
  //     })
  //     .toPromise()
  //     .then(resp => resp.json())
  //     .then(json => json.articles)
  //     .then(articles => {
  //       const list = articles
  //         .map(article =>
  //         Article.fromJSON(article));
  //       console.log('json ->', list);
  //       return list;
  //     })
  //     .catch(err => {
  //       console.log('we got an error', err);
  //     });
  //
  //   // return new Promise(resolve => {
  //   //   setTimeout(() => {
  //   //     resolve([
  //   //       new Article('The Angular 2 Screencast', 'bla bla bla...', 42),
  //   //       new Article('zweites Buch', 'auch was ganz tolles'),
  //   //       new Article('und noch ein drittes', 'Huhu das Dritte!'),
  //   //       new Article('Vier sind aber genug!', 'Der Inhalt...')
  //   //     ]);
  //   //   }, 2000);
  //   // });
  // }

}
