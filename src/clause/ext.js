module.exports = ctx => {
  const txt = build(ctx, ctx.frm)
  return txt && 'from ' + txt
}
