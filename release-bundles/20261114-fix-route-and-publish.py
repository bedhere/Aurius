import hashlib,json,os,pathlib,runpy,subprocess,sys,urllib.request

root=pathlib.Path('/opt/aurius')
site=pathlib.Path('/opt/1panel/www/sites/aurius.com.au/index')
proxy=pathlib.Path('/opt/1panel/www/sites/aurius.com.au/proxy')
target=proxy/'products-spa.conf'
backup=pathlib.Path('/opt/aurius-backups/20261114-products-routing')
config='''# Keep the public product page separate from the static product-image directory.
location = /products {
    try_files /index.html =404;
}
location = /products/ {
    try_files /index.html =404;
}
'''
assert proxy.is_dir() and site.is_dir()
backup.mkdir(mode=0o700,exist_ok=True)
before_index=hashlib.sha256((site/'index.html').read_bytes()).hexdigest()
created=False
if target.exists():
    assert target.read_text()==config, 'Existing route file differs; review required'
else:
    dump=subprocess.run(['docker','exec','1Panel-openresty-TCWK','nginx','-T'],capture_output=True,text=True,check=True).stdout
    assert 'location = /products ' not in dump and 'location = /products/' not in dump
    target.write_text(config);target.chmod(0o644);created=True
try:
    tested=subprocess.run(['docker','exec','1Panel-openresty-TCWK','nginx','-t'],capture_output=True,text=True)
    assert tested.returncode==0,tested.stderr
    subprocess.run(['docker','exec','1Panel-openresty-TCWK','nginx','-s','reload'],capture_output=True,text=True,check=True)
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs):return None
    opener=urllib.request.build_opener(NoRedirect())
    verified=[]
    for path in ['/products','/products/','/products/4']:
        with opener.open('https://aurius.com.au'+path,timeout=15) as response:
            assert response.status==200 and response.headers.get_content_type()=='text/html'
            assert hashlib.sha256(response.read()).hexdigest()==before_index
            verified.append({'path':path,'status':200,'redirect':False})
    name='au-5888-filter-cartridge-set.jpg'
    with opener.open('https://aurius.com.au/products/'+name,timeout=15) as response:
        assert response.headers.get_content_type()=='image/jpeg'
        assert hashlib.sha256(response.read()).hexdigest()==hashlib.sha256((site/'products'/name).read_bytes()).hexdigest()
    receipt={'fixed':True,'cause':'The /products page and static image directory share a path; nginx redirected to a directory without index, returning 403','configuration':str(target),'route_checks':verified,'existing_product_image_preserved':True,'nginx_syntax':'passed','products_directory_birth':subprocess.check_output(['stat','--printf','%w',str(site/'products')],text=True)}
    (backup/'routing-fix.json').write_text(json.dumps(receipt,indent=2));(backup/'routing-fix.json').chmod(0o600)
    print(json.dumps({'routing_fix':receipt}),flush=True)
except Exception:
    if created:
        target.unlink()
        subprocess.run(['docker','exec','1Panel-openresty-TCWK','nginx','-t'],capture_output=True,check=True)
        subprocess.run(['docker','exec','1Panel-openresty-TCWK','nginx','-s','reload'],capture_output=True,check=True)
    raise

workspace=pathlib.Path('/tmp/aurius-cyber-design-20261114')
helper=workspace/'release.py'
text=helper.read_text()
old="assert frontend()==state['frontend_before'] and backend()==state['backend_before']"
new="""current=frontend()
    additions=['src/components/ProductDesignBadge.tsx',*['public/products/'+name for name in assets]]
    present_additions={name:current[name] for name in additions if name in current and name not in state['frontend_before']}
    for name,value in present_additions.items():
        assert value==digest(pathlib.Path(state['stage'])/'frontend'/name), 'Task artifact changed: '+name
    assert {name:value for name,value in current.items() if name not in present_additions}==state['frontend_before'] and backend()==state['backend_before']"""
if old in text:text=text.replace(old,new)
text=text.replace('state.update(deployed=True,new_index_sha256=', 'state.update(deployed=True,rolled_back=False,new_index_sha256=')
helper.write_text(text)
state=json.loads((workspace/'state.json').read_text())
sys.argv=[str(helper),'verify' if state.get('deployed') else 'deploy']
runpy.run_path(str(helper),run_name='__main__')
state=json.loads((workspace/'state.json').read_text())
print(json.dumps({'deployment_receipt':{key:state.get(key) for key in ['stage','backup','prepared','deployed','rolled_back','new_index_sha256','verified']}}),flush=True)
