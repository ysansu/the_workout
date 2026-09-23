package com.ysansu.workout;

import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * 接管系统返回键 —— 同时覆盖 Android 10+ 的「左右边缘侧滑返回」手势
 * 和底部三键的返回按钮（两者最终都走同一套 back 分发）。
 *
 * 为什么必须自己写：
 * Capacitor 8 的 BridgeActivity 完全没有处理返回（源码里既没有 onBackPressed
 * 也没有 OnBackInvokedCallback），而本 App 的 targetSdk 是 36，
 * 系统在这种情况下的默认行为就是直接 finish 掉 Activity ——
 * 表现就是「侧滑一下直接退回桌面」。
 *
 * 这里的策略：先让 WebView 回退自己的浏览历史。
 * vue-router 用的是 hash 模式，每次 push 都会往 WebView 历史里压一条，
 * 所以 goBack() 等价于「返回上一级」，vue-router 会收到 hashchange 并渲染上一页。
 * 退无可退（说明已经在首页）时才真的退出 App。
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onBackPressed() {
        WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        // 已在根页面：交回系统，正常退出 / 退到桌面
        super.onBackPressed();
    }
}
