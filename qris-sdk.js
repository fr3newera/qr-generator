(function (global) {
    'use strict';

    var BASE_URL = 'https://qris-generator.fr3newera.com';

    function buildSrc(qrcode, name, iid) {
        return BASE_URL + '/?embed=1'
            + '&qrcode=' + encodeURIComponent(qrcode)
            + '&name='   + encodeURIComponent(name)
            + '&_iid='   + encodeURIComponent(iid);
    }

    function uid() {
        return 'fr3qris-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now();
    }

    var FR3QRIS = {

        generate: function (options) {
            var qrcode   = options.qrcode;
            var name     = options.name;
            var target   = options.target;
            var width    = options.width  || '100%';
            var onReady  = options.onReady  || null;
            var onError  = options.onError  || null;

            if (!qrcode) throw new Error('FR3QRIS: opsi "qrcode" wajib diisi.');
            if (!name)   throw new Error('FR3QRIS: opsi "name" wajib diisi.');
            if (!target) throw new Error('FR3QRIS: opsi "target" wajib diisi.');

            var container = typeof target === 'string'
                ? document.querySelector(target)
                : target;

            if (!container) throw new Error('FR3QRIS: element target tidak ditemukan.');

            var iid    = uid();
            var iframe = document.createElement('iframe');
            iframe.id                        = iid;
            iframe.src                       = buildSrc(qrcode, name, iid);
            iframe.style.width               = width;
            iframe.style.border              = 'none';
            iframe.style.display             = 'block';
            iframe.style.aspectRatio         = '1 / 1';
            iframe.setAttribute('scrolling', 'no');
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allowtransparency', 'true');

            container.appendChild(iframe);

            var lastDataUrl = null;

            function onMessage(e) {
                if (!e.data || e.data.iframeId !== iid) return;

                if (e.data.type === 'fr3qris:ready') {
                    lastDataUrl = e.data.dataUrl;
                    window.removeEventListener('message', onMessage);
                    if (typeof onReady === 'function') {
                        onReady({ dataUrl: e.data.dataUrl, nama: e.data.nama });
                    }
                }

                if (e.data.type === 'fr3qris:error') {
                    window.removeEventListener('message', onMessage);
                    if (typeof onError === 'function') {
                        onError(e.data.message);
                    } else {
                        console.error('FR3QRIS Error:', e.data.message);
                    }
                }
            }

            window.addEventListener('message', onMessage);

            return {
                iframe: iframe,
                download: function () {
                    if (lastDataUrl) {
                        var link = document.createElement('a');
                        link.href     = lastDataUrl;
                        link.download = 'QRIS-' + name.replace(/\s+/g, '-') + '.png';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    } else {
                        console.warn('FR3QRIS: QR belum selesai di-render, tunggu callback onReady.');
                    }
                },
                destroy: function () {
                    window.removeEventListener('message', onMessage);
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                }
            };
        },

        download: function (options) {
            var qrcode = options.qrcode;
            var name   = options.name;
            var onDone = options.onDone || null;

            if (!qrcode) throw new Error('FR3QRIS: opsi "qrcode" wajib diisi.');
            if (!name)   throw new Error('FR3QRIS: opsi "name" wajib diisi.');

            var iid    = uid();
            var iframe = document.createElement('iframe');
            iframe.src          = buildSrc(qrcode, name, iid);
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            function onMessage(e) {
                if (!e.data || e.data.iframeId !== iid) return;
                if (e.data.type !== 'fr3qris:ready') return;

                window.removeEventListener('message', onMessage);

                var link = document.createElement('a');
                link.href     = e.data.dataUrl;
                link.download = 'QRIS-' + name.replace(/\s+/g, '-') + '.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                document.body.removeChild(iframe);

                if (typeof onDone === 'function') onDone();
            }

            window.addEventListener('message', onMessage);
        },

        getDataUrl: function (options) {
            return new Promise(function (resolve, reject) {
                var qrcode = options.qrcode;
                var name   = options.name;

                if (!qrcode) return reject(new Error('FR3QRIS: opsi "qrcode" wajib diisi.'));
                if (!name)   return reject(new Error('FR3QRIS: opsi "name" wajib diisi.'));

                var iid    = uid();
                var iframe = document.createElement('iframe');
                iframe.src          = buildSrc(qrcode, name, iid);
                iframe.style.display = 'none';
                document.body.appendChild(iframe);

                function onMessage(e) {
                    if (!e.data || e.data.iframeId !== iid) return;
                    window.removeEventListener('message', onMessage);
                    document.body.removeChild(iframe);

                    if (e.data.type === 'fr3qris:ready') {
                        resolve(e.data.dataUrl);
                    } else {
                        reject(new Error(e.data.message || 'FR3QRIS: render gagal.'));
                    }
                }

                window.addEventListener('message', onMessage);
            });
        }
    };

    global.FR3QRIS = FR3QRIS;

})(window);
