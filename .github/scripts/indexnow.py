"""Notify IndexNow after deployment; never resubmit the complete sitemap."""
import argparse,json,os,re,subprocess,urllib.request,urllib.parse
from pathlib import Path
from html.parser import HTMLParser

HOST='www.cyrilvoyant.com'
BASE='https://'+HOST
ROOT=Path(__file__).resolve().parents[2]
class Canonical(HTMLParser):
    def __init__(self):super().__init__();self.url=None;self.noindex=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='link' and 'canonical' in a.get('rel','').split():self.url=a.get('href')
        if tag=='meta' and a.get('name','').lower() in ('robots','bingbot') and 'noindex' in a.get('content','').lower():self.noindex=True

def candidates():
    explicit=os.environ.get('INDEXNOW_URLS','').strip()
    if explicit:return explicit.splitlines()
    before='HEAD^'
    event_file=os.environ.get('GITHUB_EVENT_PATH')
    if event_file and os.environ.get('GITHUB_EVENT_NAME')=='workflow_run':
        run=json.loads(Path(event_file).read_text())['workflow_run']
        # Compare with the preceding successful Pages deployment, including
        # every commit in a multi-commit push, not just the final commit.
        api='https://api.github.com/repos/cyrilvoyant/www/actions/workflows/'+str(int(run['workflow_id']))+'/runs?status=success&per_page=30'
        req=urllib.request.Request(api,headers={'Accept':'application/vnd.github+json','User-Agent':'cyrilvoyant-indexnow'})
        with urllib.request.urlopen(req,timeout=30) as r:previous=json.load(r)['workflow_runs']
        older=[x for x in previous if x['id']<run['id'] and x['head_branch']=='main' and x['head_sha']!=run['head_sha']]
        if not older:raise RuntimeError('No earlier Pages baseline found; explicit changed URLs required')
        before=max(older,key=lambda x:x['id'])['head_sha']
        if not re.fullmatch(r'[a-f0-9]{40}',before):raise ValueError('Invalid deployment SHA')
        subprocess.run(['git','fetch','--no-tags','--depth=1','origin',before],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
        print('Comparing with previous successful Pages deployment '+before[:12])
    names=subprocess.check_output(['git','diff','--name-only','--diff-filter=AM',before,'HEAD'],cwd=ROOT,text=True).splitlines()
    urls=[]
    for name in names:
        if name.endswith('index.html'):
            url=BASE+'/'+name[:-len('index.html')]
            p=Canonical();p.feed((ROOT/name).read_text(encoding='utf-8'))
            if not p.noindex and (p.url or url).rstrip('/')==url.rstrip('/'):urls.append(url)
    return urls

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--dry-run',action='store_true');args=parser.parse_args()
    urls=sorted(set(x.strip() for x in candidates() if x.strip()))
    for u in urls:
        parsed=urllib.parse.urlsplit(u)
        if parsed.scheme!='https' or parsed.netloc!=HOST or parsed.query or parsed.fragment:raise ValueError('Excluded or invalid URL')
    if args.dry_run:print(json.dumps({'dry_run':True,'urls':urls}));return
    if not urls:print('No changed canonical HTML pages to notify.');return
    for u in urls:
        with urllib.request.urlopen(u,timeout=30) as r:
            if r.status!=200:raise RuntimeError('Deployed page unavailable')
            p=Canonical();p.feed(r.read().decode('utf-8'))
            if p.noindex or (p.url and p.url.rstrip('/')!=u.rstrip('/')):raise RuntimeError('Public canonical/noindex check failed')
    keys=[p for p in ROOT.glob('*.txt') if re.fullmatch(r'[a-fA-F0-9]{32}\.txt',p.name)]
    if len(keys)!=1:raise RuntimeError('Expected one existing IndexNow key file')
    key=keys[0].read_text(encoding='utf-8').strip()
    with urllib.request.urlopen(BASE+'/'+keys[0].name,timeout=30) as r:
        if r.read().decode('utf-8').strip()!=key:raise RuntimeError('Public key file mismatch')
    payload={'host':HOST,'key':key,'keyLocation':BASE+'/'+keys[0].name,'urlList':urls}
    req=urllib.request.Request('https://api.indexnow.org/indexnow',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json; charset=utf-8'})
    with urllib.request.urlopen(req,timeout=30) as r:status=r.status
    print(json.dumps({'status':status,'urls':urls,'meaning':'Acknowledgement only, not proof of indexing or AI citation.'}))
    if status not in (200,202):raise RuntimeError('IndexNow submission failed')

if __name__=='__main__':main()
