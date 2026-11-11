"""Read-only byte verification of the reviewed v0.28 release and v0.27 root."""
import hashlib,json,pathlib,re

def verify(root,manifest):
 root=pathlib.Path(root).resolve()
 if not isinstance(manifest,dict) or set(manifest)!={'version','files'} or type(manifest['version']) is not int or manifest['version']!=1:
  raise ValueError('Unsupported release manifest schema')
 files=manifest['files']
 if not isinstance(files,dict) or not 1<=len(files)<=100:raise ValueError('Invalid release manifest files')
 for name,wanted in files.items():
  if not isinstance(name,str) or not re.fullmatch(r'[A-Za-z0-9._/-]+',name):raise ValueError('Invalid asset path')
  relative=pathlib.PurePosixPath(name)
  if relative.is_absolute() or '..' in relative.parts or relative.as_posix()!=name:raise ValueError('Invalid asset path')
  if not isinstance(wanted,str) or not re.fullmatch(r'[0-9a-f]{64}',wanted):raise ValueError('Invalid asset hash')
  file=root/relative
  if file.is_symlink() or any(parent.is_symlink() for parent in file.parents if parent!=root and parent.is_relative_to(root)):
   raise ValueError('Asset symlink not supported')
  if not file.resolve().is_relative_to(root):raise ValueError('Asset path escapes checkout')
  if not file.is_file():raise ValueError('Asset missing: '+name)
  if hashlib.sha256(file.read_bytes()).hexdigest()!=wanted:raise ValueError('Asset hash mismatch: '+name)
 return len(files)

def main():
 root=pathlib.Path(__file__).resolve().parents[1]
 manifest=json.loads((root/'ci/reviewed-assets-v028.json').read_text())
 print('Verified',verify(root,manifest),'reviewed release/root files without changes')

if __name__=='__main__':main()
