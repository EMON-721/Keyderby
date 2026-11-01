"""Build non-overlapping, sentence-complete typing excerpts from public-domain source editions.
Source editions retain their complete license in public/sources. Automated checks do not replace editorial review.
"""
import json,re,hashlib,random
from pathlib import Path
sources=[(11,"Alice's Adventures in Wonderland",'Lewis Carroll','Literature',0),(113,'The Secret Garden','Frances Hodgson Burnett','Storytelling',0),(45,'Anne of Green Gables','L. M. Montgomery','Literature',0),(514,'Little Women','Louisa May Alcott','Literature',1),(14880,"McGuffey’s Fourth Eclectic Reader",'William Holmes McGuffey','Everyday English',0),(1342,'Pride and Prejudice','Jane Austen','Literature',1),(205,'Walden','Henry David Thoreau','Nature',1),(1228,'On the Origin of Species','Charles Darwin','Science',2),(3300,'The Wealth of Nations','Adam Smith','Business',2)]
blocked=re.compile(r'\b(?:nigg\w*|negro\w*|savage\w*|slave\w*|slavery|heathen\w*|idiot\w*|stupid|ugly|cripple\w*|lunatic\w*|inferior\s+race\w*|racial|suicide|murder\w*|kill\w*|blood\w*|death|dead|died|dying|weapon\w*|gun\w*|rifle\w*|rape\w*|sex\w*|drunk\w*|whisky|whiskey|opium|tobacco|cigar\w*|damn\w*|hell|devil\w*|curse\w*|war\w*|army|soldier\w*|punish\w*|whip\w*|hang\w*|gallows|Jew\w*|Chinaman|Hottentot\w*)\b',re.I)
seed=json.loads(Path('content/passages.json').read_text());seed=[p for p in seed if p['id'].startswith('KD-')]
counts={x:20 for x in ['easy','medium','hard']};accepted=[];seen=set(p['text'] for p in seed);stats=[];catalog=[]
for book,title,author,cat,preferred in sources:
 path=Path(f'public/sources/pg{book}.txt')
 if not path.exists():continue
 raw=path.read_text(encoding='utf-8-sig');body=re.split(r'\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*',raw,flags=re.S|re.I)[-1];body=re.split(r'\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK',body,flags=re.I)[0]
 # Restrict excerpting to original main text, excluding modern introductory notes.
 body=body.replace('\r','');paras=body.split('\n\n');paragraphs=[]
 for i,p in enumerate(paras):
  if '[' in p or ']' in p or 'http' in p or '@' in p:continue
  p=re.sub(r'\s+',' ',p).strip().replace('_','').replace('“','"').replace('”','"').replace('‘',"'").replace('’',"'").replace('—',' - ').replace('–','-')
  if not p or len(p)<120 or not re.match(r'^["\']?[A-Z]',p) or not re.search(r'[.!?]["\']?$',p):continue
  if re.search(r'\b(?:Project Gutenberg|Transcriber|Contents|Copyright|CONTENTS|CHAPTER|Footnote|PREFACE|ILLUSTRATION)\b',p,re.I):continue
  if blocked.search(p):continue
  if re.search(r"(?:^|\s)(?:'em|th'|an'|tha'|goin'|whistlin'|pipin'|hearken|dunno)(?:\s|[,.;!?])",p,re.I):continue
  # Remove clear OCR/vocabulary-list artifacts, numbered lesson paragraphs and verse.
  if re.search(r'\d+\.\s+[A-Z]',p[:8]) or sum(x.isalpha() for x in p)/len(p)<.65:continue
  if any(len(w)>30 for w in p.split()):continue
  paragraphs.append((i,p))
 per={x:0 for x in counts};ordinal=0
 for paragraph,p in paragraphs:
  # Sentences are allocated once; a source sentence never fills two difficulty tiers.
  sentences=re.findall(r'.+?(?:[.!?](?:["\'])?(?=\s+["\']?[A-Z]|$)|$)',p)
  sentences=[s.strip() for s in sentences if s.strip()];cursor=0
  while cursor<len(sentences):
   sample=' '.join(sentences[cursor:cursor+3]);word=re.findall(r"[A-Za-z]+",sample);avg=sum(map(len,word))/max(1,len(word));sentence_len=len(word)/max(1,min(3,len(sentences)-cursor));
   if preferred==2:level='hard'
   elif sentence_len<=22 and avg<=4.8:level='easy'
   else:level='medium'
   if counts[level]>=1000:
    # Medium and hard may use longer selections of easier prose; easy is never assigned difficult prose.
    if level=='easy' and counts['medium']<1000:level='medium'
    elif counts['hard']<1000 and preferred>=1:level='hard'
    else:break
   low,high={'easy':(40,100),'medium':(100,180),'hard':(150,300)}[level];chunk=[];length=0;j=cursor
   while j<len(sentences):
    n=len(sentences[j].split())
    if length+n>high:break
    chunk.append(sentences[j]);length+=n;j+=1
    if length>=low:break
   if length<low:
    cursor+=1;continue
   text=' '.join(chunk);cursor=j
   if text in seen:continue
   # Easy excerpts retain a short-sentence / common-word proxy in the complete selection.
   if level=='easy':
    ws=re.findall('[A-Za-z]+',text);avg2=sum(map(len,ws))/max(1,len(ws))
    if len(ws)/max(1,len(chunk))>23 or avg2>4.8:continue
   ordinal+=1;pid=f'CLASSIC-{book}-{paragraph}-{cursor}';provenance=json.dumps({'kind':'public-domain-excerpt','title':title,'author':author,'sourceUrl':f'https://www.gutenberg.org/ebooks/{book}','originalFile':f'/sources/pg{book}.txt','license':'Source edition states public domain in the USA. Full original edition and its license are available at originalFile.','paragraph':paragraph,'normalization':'Whitespace and typographic punctuation normalized; contiguous source sentences.','editorialReview':'automated checks plus sampled review; full editorial review pending'},ensure_ascii=False)
   accepted.append({'id':pid,'title':f'{title} · {ordinal:03}','text':text,'difficulty':level,'category':cat,'words':length,'status':'published','created':1793534400000,'updated':1793534400000,'provenance':provenance});counts[level]+=1;per[level]+=1;seen.add(text)
 stats.append({'book':book,'accepted':per,'usableParagraphs':len(paragraphs)})
 catalog.append({'id':book,'title':title,'author':author,'source':f'https://www.gutenberg.org/ebooks/{book}','file':f'/sources/pg{book}.txt','sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
all_rows=seed+accepted
for p in all_rows:
 p['characters']=len(p['text']);p['estimatedSecondsAt40Wpm']=round(p['words']/40*60);p['language']='en';p['punctuationComplexity']=round(len(re.findall(r'[^\w\s]',p['text']))/max(1,len(p['text']))*100,2);p['vocabularyComplexity']=round(sum(len(w) for w in re.findall('[A-Za-z]+',p['text']))/max(1,len(re.findall('[A-Za-z]+',p['text']))),2);p['tags']=[p['category'],p['difficulty'],'Classic excerpt' if p['id'].startswith('CLASSIC') else 'Original']
Path('content/passages.json').write_text(json.dumps(all_rows,ensure_ascii=False));Path('public/sources/catalog.json').write_text(json.dumps(catalog,indent=2));
def q(s):return "'"+str(s).replace("'","''")+"'"
Path('content/seed.sql').write_text('\n'.join('INSERT OR IGNORE INTO passages (id,title,text,difficulty,category,words,status,created,updated,provenance) VALUES ('+','.join(q(p[k]) for k in ['id','title','text','difficulty','category','words','status','created','updated','provenance'])+');' for p in all_rows))
print(json.dumps({'counts':counts,'total':len(all_rows),'sources':stats},indent=2))
