// vim: set sw=2 sts=2 ts=8 et syntax=javascript:

const Cc = Components.classes
const Ci = Components.interfaces
const Cr = Components.results
const Cu = Components.utils

/*const ZipReader = Components.Constructor(
  "@mozilla.org/libjar/zip-reader;1",
  "nsIZipReader",
  "open"
)*/
const nsFile = Components.Constructor(
  "@mozilla.org/file/local;1",
  "nsIFile",
  "initWithPath"
)
Cu.import("resource://gre/modules/XPCOMUtils.jsm")

//XPCOMUtils.defineLazyModuleGetter(this, "LauncherUtil", "resource://i2pbutton/modules/launcher-util.jsm")
Cu.import("resource://i2pbutton/modules/launcher-util.jsm")
//ChromeUtils.defineModuleGetter(this, "ZipUtils", "resource://gre/modules/ZipUtils.jsm")

Cu.import('resource://gre/modules/osfile.jsm')
Cu.import('resource://gre/modules/FileUtils.jsm')

const defaultProxyTunnels = `# Autogenerated by I2P Browser
tunnel.0.description=HTTP proxy for browsing eepsites and the web
tunnel.0.interface=127.0.0.1
tunnel.0.listenPort=4444
tunnel.0.name=I2P HTTP Proxy
tunnel.0.option.i2cp.closeIdleTime=1800000
tunnel.0.option.i2cp.closeOnIdle=false
tunnel.0.option.i2cp.delayOpen=false
tunnel.0.option.i2cp.destination.sigType=7
tunnel.0.option.i2cp.newDestOnResume=false
tunnel.0.option.i2cp.reduceIdleTime=900000
tunnel.0.option.i2cp.reduceOnIdle=true
tunnel.0.option.i2cp.reduceQuantity=1
tunnel.0.option.i2p.streaming.connectDelay=0
tunnel.0.option.i2ptunnel.httpclient.SSLOutproxies=false.i2p
tunnel.0.option.i2ptunnel.httpclient.allowInternalSSL=true
tunnel.0.option.i2ptunnel.httpclient.jumpServers=http://stats.i2p/cgi-bin/jump.cgi?a=,http://i2pjump.i2p/jump/
tunnel.0.option.i2ptunnel.httpclient.sendAccept=false
tunnel.0.option.i2ptunnel.httpclient.sendReferer=false
tunnel.0.option.i2ptunnel.httpclient.sendUserAgent=false
tunnel.0.option.i2ptunnel.useLocalOutproxy=false
tunnel.0.option.inbound.backupQuantity=0
tunnel.0.option.inbound.length=3
tunnel.0.option.inbound.lengthVariance=0
tunnel.0.option.inbound.nickname=shared clients
tunnel.0.option.inbound.quantity=6
tunnel.0.option.outbound.backupQuantity=0
tunnel.0.option.outbound.length=3
tunnel.0.option.outbound.lengthVariance=0
tunnel.0.option.outbound.nickname=shared clients
tunnel.0.option.outbound.priority=10
tunnel.0.option.outbound.quantity=6
tunnel.0.option.outproxyAuth=false
tunnel.0.option.persistentClientKey=false
tunnel.0.option.sslManuallySet=true
tunnel.0.option.useSSL=false
tunnel.0.proxyList=false.i2p
tunnel.0.sharedClient=true
tunnel.0.startOnLoad=true
tunnel.0.type=httpclient
`

const defaultClientsConfig = `# Autogenerated by I2P Browser
clientApp.0.args=7657 ::1,127.0.0.1 ./webapps/
clientApp.0.main=net.i2p.router.web.RouterConsoleRunner
clientApp.0.name=I2P Router Console
clientApp.0.onBoot=true
clientApp.0.startOnLoad=true
clientApp.1.main=net.i2p.i2ptunnel.TunnelControllerGroup
clientApp.1.name=Application tunnels
clientApp.1.args=i2ptunnel.config
clientApp.1.delay=-1
clientApp.1.startOnLoad=true
`

const defaultSocksProxyTunnels = `# Autogenerated by I2P Browser
tunnel.1.interface=127.0.0.1
tunnel.1.listenPort=4455
tunnel.1.name=SOCKS
tunnel.1.option.i2cp.closeIdleTime=1800000
tunnel.1.option.i2cp.closeOnIdle=false
tunnel.1.option.i2cp.delayOpen=false
tunnel.1.option.i2cp.destination.sigType=7
tunnel.1.option.i2cp.newDestOnResume=false
tunnel.1.option.i2cp.reduceIdleTime=1200000
tunnel.1.option.i2cp.reduceOnIdle=false
tunnel.1.option.i2cp.reduceQuantity=1
tunnel.1.option.i2p.streaming.connectDelay=0
tunnel.1.option.i2ptunnel.httpclient.allowInternalSSL=false
tunnel.1.option.i2ptunnel.httpclient.sendAccept=false
tunnel.1.option.i2ptunnel.httpclient.sendReferer=false
tunnel.1.option.i2ptunnel.httpclient.sendUserAgent=false
tunnel.1.option.i2ptunnel.useLocalOutproxy=true
tunnel.1.option.inbound.backupQuantity=0
tunnel.1.option.inbound.length=3
tunnel.1.option.inbound.lengthVariance=0
tunnel.1.option.inbound.nickname=SOCKS
tunnel.1.option.inbound.quantity=3
tunnel.1.option.outbound.backupQuantity=0
tunnel.1.option.outbound.length=3
tunnel.1.option.outbound.lengthVariance=0
tunnel.1.option.outbound.nickname=SOCKS
tunnel.1.option.outbound.quantity=3
tunnel.1.option.outproxyAuth=false
tunnel.1.option.persistentClientKey=false
tunnel.1.option.useSSL=false
tunnel.1.proxyList=exitpoint.i2p
tunnel.1.sharedClient=false
tunnel.1.startOnLoad=false
tunnel.1.type=sockstunnel
`

const defaultRouterConfig = `# Autogenerated by I2P Browser
i2np.laptopMode=true
i2np.upnp.enable=true
i2np.udp.addressSources=local,upnp,ssu
i2p.reseedURL=https://download.xxlspeed.com/,https://i2p.mooo.com/netDb/,https://i2p.novg.net/,https://i2pseed.creativecowpat.net:8443/,https://itoopie.atomike.ninja/,https://netdb.i2p2.no/,https://reseed.i2p-projekt.de/,https://reseed.i2p.net.in/,https://reseed.memcpy.io/,https://reseed.onion.im/
router.outboundPool.quantity=7
router.inboundPool.quantity=7
router.sharePercentage=50
`


function RouterConfigManager() {
  this.version = '0.1'
  this.routerCertsZipFile = LauncherUtil.getI2PFile("certszip", false)
  this._logger = Cc["@geti2p.net/i2pbutton-logger;1"].getService(Ci.nsISupports).wrappedJSObject
  this._logger.log(3, "I2pbutton I2P RouterConfigManager Service initialized")
  this.wrappedJSObject = this
}

RouterConfigManager.prototype = {
  // properties required for XPCOM registration:
  classDescription: "A component for handling the embedded router config",
  classID:          Components.ID("{E2AA62BB-AFD0-4D94-9408-90CE39784086}"),
  contractID:       "@geti2p.net/i2pbutton-router-config-mgr;1",
  serviceName:      'RouterConfigManager',
  wrappedJSObject:  null,
  _logger:          null,
  state:            {},

  // nsISupports implementation.
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsISupports]),



  _write_router_config: function(configfile,onComplete) {
    const self = this
    LauncherUtil.writeFileWithData(configfile, defaultRouterConfig, file => { onComplete(file) }, (err) => {
      this._logger.log(6,`Can't write router config file :( - path was ${configfile.path}`)
    })
  },
  _write_tunnel_config: function(configfile,onComplete) {
    const self = this
    LauncherUtil.writeFileWithData(configfile, defaultProxyTunnels, file => { onComplete(file) }, (err) => {
      this._logger.log(6,`Can't write tunnel proxy config file :( - path was ${configfile.path}`)
    })
  },
  _write_clients_config: function(configfile,onComplete) {
    const self = this
    LauncherUtil.writeFileWithData(configfile, defaultClientsConfig, file => { onComplete(file) }, (err) => {
      this._logger.log(6,`Can't write clients config file :( - path was ${configfile.path}`)
    })
  },


  ensure_config: function(onCompleteCallback) {
    let configDirectory = LauncherUtil.getI2PConfigPath(true)
    let routerConfigFile = configDirectory.clone()
    routerConfigFile.append('router.config')
    let tunnelConfigFIle = configDirectory.clone()
    tunnelConfigFIle.append('i2ptunnel.config')
    let clientsConfigFIle = configDirectory.clone()
    clientsConfigFIle.append('clients.config')

    // Ensure they exists
    if (!routerConfigFile.exists) {
      this._write_router_config(routerConfigFile, file => {
        if (typeof onCompleteCallback === 'function') onCompleteCallback(file)
      })
    }
    if (!tunnelConfigFIle.exits) {
      this._write_tunnel_config(tunnelConfigFIle, tfile => {
        if (typeof onCompleteCallback === 'function') onCompleteCallback(tfile)
      })
    }
    if (!clientsConfigFIle.exits) {
      this._write_tunnel_config(tunnelConfigFIle, tfile => {
        if (typeof onCompleteCallback === 'function') onCompleteCallback(tfile)
      })
    }
  },
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([RouterConfigManager])
