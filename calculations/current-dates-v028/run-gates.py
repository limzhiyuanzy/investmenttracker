"""Reproducible candidate gates. Fresh label required; never overwrites evidence."""
import pathlib,os,json,subprocess,re,argparse,hashlib,tempfile
HERE=pathlib.Path(__file__).resolve().parent;ROOT=HERE.parents[1]
HANDLERS=['durable.test.cjs','admission.test.cjs','r3-presence.test.cjs','r4-sparse.test.cjs','r5-identifiers.test.cjs','r6-closure.test.cjs']
EXPECTED_HANDLERS={'all original engine styles dock fonts licence preserved','policy failure is atomic and retry on same UI callback round trips exact financial state','policy old successful form callback cannot commit again','all admitted future schedule numerics are finite before commit','policy committed display failure is visible globally and rejects reopened resubmission'}
EXPECTED_BACKUP={'candidate preserves original style and engine bytes, embeds reviewed modules and has six assets','authenticated independent attacker payload rejects future cutoff'}
def main():
 p=argparse.ArgumentParser();p.add_argument('--label',required=True);p.add_argument('--native',action='store_true');a=p.parse_args();out=HERE/'gates'/a.label;out.mkdir(parents=True,exist_ok=False);rows=[];baseenv={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'};baseenv.pop('NODE_OPTIONS',None)
 def run(name,command,env=None,expected=None):
  r=subprocess.run(command,cwd=ROOT,env={**baseenv,**(env or {})},capture_output=True,text=True);log=out/(name+'.log');log.write_text(r.stdout+r.stderr);row={'name':name,'command':command,'env':env or {},'exit':r.returncode,'log':str(log.relative_to(ROOT))};rows.append(row)
  if '--test' in command:
   counts=dict((k,int(n))for k,n in re.findall(r'^# (tests|pass|fail|skipped|cancelled|todo) (\d+)$',r.stdout,re.M));row['counts']=counts;failures=re.findall(r'^not ok \d+ - (.*)$',r.stdout,re.M);row['failures']=failures
   assert counts.get('tests',0)>0 and counts.get('skipped')==0 and counts.get('cancelled')==0,(name,counts)
   if expected is not None:assert set(failures)==expected and len(failures)==len(expected),(name,failures);row['status']='EXPECTED_SUPERSEDED_ASSERTIONS' if expected else 'PASS'
   else:assert r.returncode==0,(name,r.returncode,str(log));row['status']='PASS'
  else:assert r.returncode==0,(name,r.returncode,str(log));row['status']='PASS'
  print(name,row['status'],row.get('counts',''),flush=True)
  (out/'commands.json').write_text(json.dumps(rows,indent=2)+'\n');return r
 run('build',['python3',str(HERE/'build.py'),'--output',str(ROOT/'app/quiet-banking-v0.28'),'--tag','local-v0.28'])
 scratch=pathlib.Path(tempfile.mkdtemp(prefix='qb-v028-repro-',dir=os.environ['TMPDIR']));first=json.loads((out/'build.log').read_text());second=run('build-repeat',['python3',str(HERE/'build.py'),'--output',str(scratch/'same-package'),'--tag','local-v0.28']);second=json.loads(second.stdout);assert first==second,'Repeated build receipts differ';rows[-1]['byte_identical_package']=True
 env={'CANDIDATE_HTML':str(ROOT/'app/quiet-banking-v0.28/index.html'),'STORE_MODULE':str(HERE/'store.cjs'),'BACKUP_MODULE':str(HERE/'crypto.cjs'),'DATE_MODULE':str(HERE/'date-policy.cjs')}
 run('new-units',['node','--test','--test-reporter=tap',*[str(HERE/n)for n in ['date-policy.test.cjs','compatibility.test.cjs','financial-unit.test.cjs','engine-bounds.test.cjs','form-boundaries.test.cjs','clock-range.test.cjs']]],env)
 run('candidate-engine',['node','--test','--test-reporter=tap','calculations/derived-engine-v0.20.test.cjs'],{'V020_ENGINE':str(HERE/'cashflow-engine.cjs')})
 adapter={'NODE_OPTIONS':'--require='+str(HERE/'retarget.cjs')}
 run('candidate-handlers',['node','--test','--test-reporter=tap',*[str(ROOT/'calculations/durable-records-v025'/n)for n in HANDLERS]],adapter,EXPECTED_HANDLERS)
 run('candidate-backup',['node','--test','--test-reporter=tap','calculations/backup-v027/backup.test.cjs','calculations/backup-v027/crypto-adversarial.test.cjs'],adapter,EXPECTED_BACKUP)
 run('preserved-baseline-handlers',['node','--test','--test-reporter=tap',*[str(ROOT/'calculations/durable-records-v025'/n)for n in HANDLERS]],{'DLR_APP':str(ROOT/'app/quiet-banking-v0.27/index.html')})
 run('preserved-baseline-backup',['node','--test','--test-reporter=tap','calculations/backup-v027/backup.test.cjs','calculations/backup-v027/crypto-adversarial.test.cjs'])
 if a.native:
  run('derive-native',['python3',str(HERE/'derive-native.py')])
  run('native-today',['python3',str(HERE/'native-acceptance.py')],{'CANDIDATE_DIR':str(ROOT/'app/quiet-banking-v0.28'),'RUN_NAME':a.label+'-today'})
  run('native-context',['python3',str(HERE/'native-context.py'),'--label',a.label])
  run('native-deep',['python3',str(HERE/'native-deep.py')],{'RUN_NAME':a.label+'-deep'})
  run('native-schema-oldreader',['python3',str(HERE/'native-schema.py'),'--label',a.label,'--file',str(HERE/(a.label+'-deep-current.qbb'))])
  run('native-preserved-backup',['python3',str(HERE/'preserved-native.py')],{'RUN_NAME':a.label+'-preserved-backup'})
  run('native-spec1',['python3',str(HERE/'preserved-spec1-native.py'),'--label',a.label])
  run('native-spec2',['python3',str(HERE/'preserved-spec2-native.py'),'--label',a.label])
  run('native-qsec1',['python3',str(HERE/'preserved-startup-storage-native.py'),'--label',a.label])
  run('native-update',['python3',str(HERE/'preserved-update.py')],{'RUN_NAME':a.label+'-update'})
  # Restore the final-tag exact HTML delta after alternate update builds.
  run('final-source-delta',['python3',str(HERE/'build.py'),'--output',str(ROOT/'app/quiet-banking-v0.28'),'--tag','local-v0.28'])
 assert hashlib.sha256((ROOT/'app/quiet-banking-v0.28/index.html').read_bytes()).hexdigest()==first['package']['index.html']
 (out/'commands.json').write_text(json.dumps(rows,indent=2)+'\n');print('COMPLETED',out)
if __name__=='__main__':main()
